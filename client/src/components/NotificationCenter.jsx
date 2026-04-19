import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import api from '../api/axios';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef(null);
    const buttonRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.IsRead).length);
        } catch (err) {
            console.error("Error fetching notifications", err);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.NotificationID === id ? { ...n, IsRead: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.IsRead);
        setNotifications(prev => prev.map(n => ({ ...n, IsRead: 1 })));
        setUnreadCount(0);
        await Promise.allSettled(
            unread.map(n => api.put(`/notifications/${n.NotificationID}/read`))
        );
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        // Use mousedown + touchstart so it fires before click
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [isOpen]);

    const toggleOpen = () => {
        setIsOpen(prev => !prev);
        if (!isOpen) fetchNotifications();
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                className="relative p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition text-slate-600 hover:text-blue-600 shadow-sm"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold animate-pulse shadow-sm border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel — fixed so it never gets clipped */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="fixed top-[4.5rem] right-4 z-[9999] w-[min(22rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5 animate-fade-in-up origin-top-right"
                >
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-blue-600" />
                            <h3 className="font-bold text-slate-800">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-200/50 rounded-lg"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="max-h-[50vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 flex flex-col items-center gap-3 text-center px-4">
                                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                                    <Bell size={22} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm font-medium">You're all caught up!</p>
                                <p className="text-xs text-slate-400">New notifications will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map(notif => (
                                    <div
                                        key={notif.NotificationID}
                                        onClick={() => !notif.IsRead && handleMarkAsRead(notif.NotificationID)}
                                        className={`px-4 py-3.5 transition cursor-pointer hover:bg-slate-50 group ${
                                            notif.IsRead ? '' : 'bg-blue-50/50 border-l-2 border-l-blue-500'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className={`text-sm leading-snug flex-1 ${
                                                notif.IsRead ? 'text-slate-600 font-medium' : 'font-bold text-slate-900'
                                            }`}>
                                                {notif.Title}
                                            </h4>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                    {new Date(notif.CreatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                {!notif.IsRead && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                            {notif.Message}
                                        </p>
                                        {!notif.IsRead && (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleMarkAsRead(notif.NotificationID); }}
                                                className="mt-1.5 text-[10px] text-blue-600 hover:underline flex items-center gap-1 transition-opacity"
                                            >
                                                <Check size={10} /> Mark as read
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-400">{notifications.length} total</span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 transition"
                                >
                                    <Check size={11} /> Mark all read
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
