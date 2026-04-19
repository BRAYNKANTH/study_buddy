import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import api from '../api/axios';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

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
            // Optimistic update
            setNotifications(prev => prev.map(n => n.NotificationID === id ? { ...n, IsRead: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) fetchNotifications();
    };

    return (
        <div className="relative z-50">
            <button
                onClick={toggleOpen}
                className="relative p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition text-slate-600 hover:text-blue-600 shadow-sm"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold animate-pulse shadow-sm border border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up origin-top-right ring-1 ring-slate-900/5">
                        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Notifications</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-200/50 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                                        <Bell size={24} />
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">No new notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map(notif => (
                                        <div
                                            key={notif.NotificationID}
                                            onClick={() => !notif.IsRead && handleMarkAsRead(notif.NotificationID)}
                                            className={`p-4 transition cursor-pointer hover:bg-slate-50 ${notif.IsRead ? 'opacity-75' : 'bg-blue-50/40'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1.5">
                                                <h4 className={`text-sm ${notif.IsRead ? 'text-slate-700 font-medium' : 'font-bold text-blue-900'}`}>
                                                    {notif.Title}
                                                    {!notif.IsRead && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    {new Date(notif.CreatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                {notif.Message}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={async () => {
                                    const unread = notifications.filter(n => !n.IsRead);
                                    // Optimistic UI update first
                                    setNotifications(prev => prev.map(n => ({ ...n, IsRead: 1 })));
                                    setUnreadCount(0);
                                    // Persist to server
                                    await Promise.allSettled(
                                        unread.map(n => api.put(`/notifications/${n.NotificationID}/read`))
                                    );
                                }}
                                className="text-xs text-blue-600 font-medium hover:underline"
                            >
                                Mark all as read
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
