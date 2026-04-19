import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import ModuleCard from '../../components/ModuleCard';
import SkeletonCard from '../../components/SkeletonCard';
import BottomNav from '../../components/BottomNav';
import ClassView from './ClassView';
import Chat from '../communication/Chat';
import QRScanner from '../../components/QRScanner';
import EmptyState from '../../components/EmptyState';

const TutorDashboard = () => {
    const { user, logout } = useAuth();
    const [view, setView] = useState('dashboard'); // 'dashboard', 'class', 'timetable', 'chat'
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null); // { subject, grade }
    const [timetableData, setTimetableData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Today's Sessions State
    const [todaySessions, setTodaySessions] = useState([]);
    const [showScanner, setShowScanner] = useState(false);
    const [scanningSessionId, setScanningSessionId] = useState(null);

    useEffect(() => {
        fetchModules();
        fetchTimetable();
        fetchTodaySessions();
    }, []);

    const fetchModules = async () => {
        try {
            const res = await api.get('/attendance/teacher/classes');
            setModules(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchTimetable = async () => {
        try {
            const res = await api.get('/academic/timetable/teacher');
            setTimetableData(res.data);
        } catch (err) {
            console.error("Failed to fetch timetable", err);
        }
    };

    const fetchTodaySessions = async () => {
        try {
            const res = await api.get('/attendance/teacher/sessions');
            // Filter for TODAY locally (server returns >= today)
            const today = new Date().toDateString();
            const sessionsToday = res.data.filter(s => new Date(s.Date).toDateString() === today);
            setTodaySessions(sessionsToday);
        } catch (err) {
            console.error("Failed to fetch sessions", err);
        }
    };

    const handleSelectGrade = (mod) => {
        setSelectedModule(mod);
        setView('class');
    };

    // Chat Navigation State
    const [chatInitialContact, setChatInitialContact] = useState(null);

    const handleNavigateToChat = (contact) => {
        setChatInitialContact(contact);
        setView('chat');
    };

    const handleBack = () => {
        setSelectedModule(null);
        setView('dashboard');
        fetchTodaySessions(); // Refresh when returning
    };

    // QR Scanning Logic
    const handleScanClick = (sessionId) => {
        setScanningSessionId(sessionId);
        setShowScanner(true);
    };

    const handleScan = async (decodedText) => {
        if (!scanningSessionId) {
            toast.error("Error: No session selected.");
            return;
        }
        // Find session details to get SubjectID
        const session = todaySessions.find(s => s.SessionID === scanningSessionId);
        if (!session) return toast.error("Session not found context");

        try {
            const res = await api.post('/attendance/mark', {
                studentId: decodedText,
                subjectId: session.SubjectID,
                sessionId: scanningSessionId,
                status: 'Present'
            });
            toast.success(`Attendance Marked for ${res.data.studentName}!`);
        } catch (err) {
            console.log("Scan error", err);
            toast.error("Failed to mark attendance: " + (err.response?.data?.message || err.message));
        }
    };

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/communication/unread-count');
            setUnreadCount(res.data.count);
        } catch (err) { console.error(err); }
    };

    // Change Password State
    const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passMessage, setPassMessage] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passData.newPassword !== passData.confirmPassword) {
            setPassMessage("New passwords do not match.");
            return;
        }
        try {
            await api.post('/auth/change-password', {
                currentPassword: passData.currentPassword,
                newPassword: passData.newPassword
            });
            setPassMessage("Password updated successfully!");
            setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPassMessage(err.response?.data?.message || "Error updating password.");
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8 transition-colors duration-300 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                {/* Global Header */}
                <PageHeader
                    title="Tutor Dashboard"
                    subtitle={`Welcome back, ${user?.name}`}
                    onLogout={logout}
                    onSettings={() => setView('settings')}
                />

                {/* Sub Navigation */}
                {view !== 'class' && view !== 'settings' && (
                    <div className="hidden md:flex gap-1 border-b border-slate-200 pb-0 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'dashboard', label: 'My Classes', icon: '📚' },
                            { id: 'timetable', label: 'Timetable', icon: '📅' },
                            { id: 'chat', label: 'Messages', icon: '💬' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { if (tab.id === 'chat') setChatInitialContact(null); setView(tab.id); }}
                                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition whitespace-nowrap border-b-2 -mb-px ${view === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-900 border-transparent'}`}
                            >
                                <span className="hidden sm:inline">{tab.icon}</span>
                                {tab.label}
                                {tab.id === 'chat' && unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-md">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {view === 'settings' ? (
                    <div className="glass-card p-8 max-w-md mx-auto bg-white border border-slate-200 shadow-sm">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Change Password</h2>
                        {passMessage && <p className={`mb-4 p-3 rounded ${passMessage.includes('success') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{passMessage}</p>}
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-slate-600 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-none transition"
                                    value={passData.currentPassword}
                                    onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-slate-600 mb-1">New Password</label>
                                <input
                                    type="password"
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-none transition"
                                    value={passData.newPassword}
                                    onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-slate-600 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 outline-none transition"
                                    value={passData.confirmPassword}
                                    onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setView('dashboard')} className="flex-1 py-3 text-slate-500 hover:text-slate-900 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition">Update</button>
                            </div>
                        </form>
                    </div>
                ) : view === 'chat' ? <Chat initialContact={chatInitialContact} onMessageRead={fetchUnreadCount} /> : view === 'dashboard' ? (
                    <>
                        {/* Today's Sessions Section */}
                        {!loading && todaySessions.length === 0 && (
                            <div className="flex items-center gap-4 px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl mb-2">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="font-semibold text-blue-800 text-sm">No sessions scheduled for today</p>
                                    <p className="text-xs text-blue-500 mt-0.5">Check your timetable or enjoy a free day!</p>
                                </div>
                            </div>
                        )}
                        {todaySessions.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                                    Today's Sessions <span className="text-sm font-normal text-slate-500 ml-2">({new Date().toLocaleDateString()})</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {todaySessions.map(sess => (
                                        <div key={sess.SessionID} className="p-5 bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 transition group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="flex justify-between items-start mb-3 relative z-10">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg">{sess.SubjectName}</h3>
                                                    <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-semibold mt-1 inline-block">Grade {sess.Grade}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-blue-600 font-bold">{sess.StartTime.slice(0, 5)}</div>
                                                    <div className="text-xs text-slate-400">{sess.EndTime.slice(0, 5)}</div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleScanClick(sess.SessionID)}
                                                className="w-full mt-2 py-3 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 hover:border-blue-600 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-all duration-300 group-hover:translate-y-0"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                                Scan Attendance
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div>
                                <div className="skeleton h-6 w-32 rounded mb-4" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <SkeletonCard count={3} height="h-40" />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-4">My Classes</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {modules.map((mod, idx) => (
                                        <ModuleCard
                                            key={idx}
                                            title={`${mod.SubjectName} - Grade ${mod.Grade}`} // Combined Title
                                            description={`${mod.StudentCount || 0} Students`}
                                            color="from-blue-500 to-blue-700"
                                            onClick={() => handleSelectGrade(mod)}
                                        />
                                    ))}
                                    {modules.length === 0 && (
                                        <div className="col-span-full">
                                            <EmptyState
                                                icon="📚"
                                                title="No Classes Assigned"
                                                subtitle="Your assigned classes will appear here once the admin sets them up."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : view === 'timetable' ? (
                    <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">My Weekly Schedule</h2>
                        <div className="space-y-4">
                            {timetableData.length === 0 ? (
                                <EmptyState
                                    icon="📅"
                                    title="No Weekly Schedule"
                                    subtitle="Your recurring timetable will appear here once the admin adds it."
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {timetableData.map(t => (
                                        <div key={t.TimetableID} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition hover:shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-blue-600 font-bold">{t.DayOfWeek}</span>
                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded border border-blue-200">{t.Grade}</span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900">{t.SubjectName}</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {t.StartTime.slice(0, 5)} - {t.EndTime.slice(0, 5)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <ClassView
                        subject={selectedModule}
                        grade={selectedModule.Grade}
                        onBack={handleBack}
                        onNavigateToChat={handleNavigateToChat}
                    />
                )}
            </div>

            {showScanner && <QRScanner onScanPromise={handleScan} onClose={() => setShowScanner(false)} />}

            {/* Mobile Bottom Navigation — hide when inside a class view */}
            {view !== 'class' && (
                <BottomNav
                    items={[
                        { id: 'dashboard', label: 'Classes', icon: '📚', badge: 0 },
                        { id: 'timetable', label: 'Timetable', icon: '📅', badge: 0 },
                        { id: 'chat', label: 'Messages', icon: '💬', badge: unreadCount },
                        { id: 'settings', label: 'Settings', icon: '⚙️', badge: 0 },
                    ]}
                    activeTab={view}
                    onTabChange={(id) => { if (id === 'chat') setChatInitialContact(null); setView(id); }}
                />
            )}
        </div>
    );
}

export default TutorDashboard;
