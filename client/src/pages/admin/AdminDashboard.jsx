import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import TutorManagement from './TutorManagement';
import StudentManagement from './StudentManagement';
import SubjectManagement from './SubjectManagement';
import PageHeader from '../../components/PageHeader';
import BottomNav from '../../components/BottomNav';
import api from '../../api/axios';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [pendingPayments, setPendingPayments] = useState([]);
    const [stats, setStats] = useState(null);

    // Announcement State
    const [annTitle, setAnnTitle] = useState('');
    const [annContent, setAnnContent] = useState('');
    const [annTarget, setAnnTarget] = useState('All');
    const [annGrade, setAnnGrade] = useState('All');

    // Timetable State (Sessions)
    const [scheduleGrade, setScheduleGrade] = useState('6');
    const [scheduleSubject, setScheduleSubject] = useState('');
    const [scheduleTeacher, setScheduleTeacher] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');

    // Weekly Timetable State
    const [timetableMode, setTimetableMode] = useState('sessions'); // 'sessions' or 'weekly'
    const [timetable, setTimetable] = useState([]);
    const [ttDay, setTtDay] = useState('Monday');
    const [ttStart, setTtStart] = useState('');
    const [ttEnd, setTtEnd] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Weekly Timetable Filters
    const [filterGrade, setFilterGrade] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterTeacher, setFilterTeacher] = useState('');

    const [subjects, setSubjects] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [viewGrade, setViewGrade] = useState(''); // Filter for list view

    // Derived states for fees
    const registrationPayments = pendingPayments.filter(p => !p.IsApproved);
    const monthlyPayments = pendingPayments.filter(p => p.IsApproved);

    useEffect(() => {
        fetchPayments();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/users/stats');
            setStats(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (activeTab === 'timetable') {
            fetchSchedulerData();
            fetchSessions();
            fetchTimetable();
        }
    }, [activeTab, viewGrade]);

    const fetchSchedulerData = async () => {
        try {
            const [subRes, tutRes] = await Promise.all([
                api.get('/academic/subjects'),
                api.get('/users/tutors')
            ]);
            setSubjects(subRes.data);
            setTutors(tutRes.data);
            if (subRes.data.length > 0) setScheduleSubject(subRes.data[0].SubjectID);
            if (tutRes.data.length > 0) setScheduleTeacher(tutRes.data[0].TeacherID);
        } catch (err) { console.error(err); }
    };

    const fetchSessions = async () => {
        try {
            const res = await api.get(`/academic/sessions?grade=${viewGrade}`);
            setSessions(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTimetable = async () => {
        try {
            const res = await api.get('/academic/timetable');
            setTimetable(res.data);
        } catch (err) { console.error(err); }
    };

    const handleScheduleClass = async (e) => {
        e.preventDefault();
        try {
            await api.post('/academic/sessions', {
                grade: scheduleGrade,
                subjectId: scheduleSubject,
                teacherId: scheduleTeacher,
                date: scheduleDate,
                startTime: scheduleStart,
                endTime: scheduleEnd
            });
            toast.success("Class scheduled successfully!");
            fetchSessions(); // Refresh list
        } catch (err) {
            toast.error("Error scheduling class");
        }
    };

    const handleAddToTimetable = async (e) => {
        e.preventDefault();
        try {
            await api.post('/academic/timetable', {
                subjectId: scheduleSubject,
                grade: scheduleGrade,
                teacherId: scheduleTeacher,
                dayOfWeek: ttDay,
                startTime: ttStart,
                endTime: ttEnd
            });
            toast.success("Timetable updated!");
            fetchTimetable();
        } catch (err) {
            toast.error("Error updating timetable");
        }
    };

    const handleDeleteTimetable = async (id) => {
        try {
            await api.delete(`/academic/timetable/${id}`);
            toast.success("Timetable slot removed");
            fetchTimetable();
        } catch (err) { toast.error("Error deleting slot"); }
    };

    const fetchPayments = async () => {
        try {
            const res = await api.get('/payments/pending');
            setPendingPayments(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleVerify = async (id, status) => {
        try {
            await api.put('/payments/verify', { paymentId: id, status });
            toast.success(`Payment ${status.toLowerCase()}`);
            fetchPayments(); // Refresh
        } catch (err) {
            toast.error("Error updating payment");
        }
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await api.post('/communication/announcements', {
                title: annTitle,
                content: annContent,
                date: new Date(),
                targetAudience: annTarget,
                grade: annGrade
            });
            toast.success("Announcement posted!");
            setAnnTitle(''); setAnnContent(''); setAnnTarget('All'); setAnnGrade('All');
        } catch (err) { toast.error("Error posting announcement"); }
    };

    const adminNavItems = [
        { id: 'overview', label: 'Home', icon: '🏠', badge: 0 },
        { id: 'fees', label: 'Fees', icon: '💰', badge: monthlyPayments.length },
        { id: 'registrations', label: 'Register', icon: '📝', badge: registrationPayments.length },
        { id: 'communication', label: 'Announce', icon: '📢', badge: 0 },
        { id: 'timetable', label: 'Schedule', icon: '📅', badge: 0 },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8 transition-colors duration-300 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <PageHeader
                    title="Admin Dashboard"
                    subtitle={`Welcome, ${user?.name}`}
                    onLogout={logout}
                />

                {/* Tabs — hidden on mobile, shown on desktop */}
                <div className="hidden md:flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                    {['overview', 'tutors', 'students', 'subjects', 'registrations', 'fees', 'communication', 'timetable'].map(tab => {
                        let label = tab;
                        let count = 0;

                        if (tab === 'fees') {
                            label = 'Fee Management';
                            count = monthlyPayments.length;
                        } else if (tab === 'registrations') {
                            label = 'Registrations Pending';
                            count = registrationPayments.length;
                        }

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 capitalize whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'glass-button bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'}`}
                            >
                                {label}
                                {count > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm pulse-animation">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">

                        {/* ── STATS BAR ── */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: 'Students', value: stats?.totalStudents ?? '—', icon: '🎓', color: 'blue', sub: `${stats?.approvedStudents ?? 0} active` },
                                { label: 'Teachers', value: stats?.totalTeachers ?? '—', icon: '👨‍🏫', color: 'indigo', sub: 'teaching staff' },
                                { label: 'Parents', value: stats?.totalParents ?? '—', icon: '👨‍👩‍👧', color: 'purple', sub: 'registered' },
                                { label: 'Pending Fees', value: monthlyPayments.length, icon: '💰', color: 'amber', sub: 'awaiting verify', alert: monthlyPayments.length > 0 },
                                { label: 'New Registrations', value: registrationPayments.length, icon: '📝', color: 'rose', sub: 'need approval', alert: registrationPayments.length > 0 },
                                { label: "Today's Classes", value: stats?.todaySessions ?? '—', icon: '📅', color: 'emerald', sub: 'sessions today' },
                            ].map((s, i) => (
                                <div key={i} className={`bg-white border rounded-2xl p-4 flex flex-col gap-1 shadow-sm relative overflow-hidden ${s.alert ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                                    <div className="flex justify-between items-start">
                                        <span className="text-2xl">{s.icon}</span>
                                        {s.alert && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                    </div>
                                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
                                    <p className="text-xs font-semibold text-slate-600">{s.label}</p>
                                    <p className="text-xs text-slate-400">{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── ACTION CARDS ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { icon: '👨‍🏫', emoji_bg: 'bg-blue-50', title: 'Manage Users', desc: 'Add or edit tutors and student profiles.', tab: 'tutors', color: 'blue', badge: null },
                                { icon: '💰', emoji_bg: 'bg-emerald-50', title: 'Fee Management', desc: 'Verify monthly fee payments.', tab: 'fees', color: 'emerald', badge: monthlyPayments.length },
                                { icon: '📝', emoji_bg: 'bg-blue-50', title: 'Registrations', desc: 'Approve new student registrations.', tab: 'registrations', color: 'blue', badge: registrationPayments.length },
                                { icon: '📢', emoji_bg: 'bg-violet-50', title: 'Announcements', desc: 'Post updates and news to all users.', tab: 'communication', color: 'violet', badge: null },
                                { icon: '📚', emoji_bg: 'bg-amber-50', title: 'Manage Subjects', desc: 'Add or edit system subjects.', tab: 'subjects', color: 'amber', badge: null },
                                { icon: '📅', emoji_bg: 'bg-slate-50', title: 'Timetable', desc: 'Schedule classes and weekly slots.', tab: 'timetable', color: 'slate', badge: null },
                            ].map((card, i) => (
                                <div
                                    key={i}
                                    onClick={() => setActiveTab(card.tab)}
                                    className="bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex items-start gap-4 relative overflow-hidden"
                                >
                                    <div className={`w-12 h-12 ${card.emoji_bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform relative`}>
                                        {card.icon}
                                        {card.badge > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow animate-bounce">
                                                {card.badge}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 text-base mb-0.5">{card.title}</h3>
                                        <p className="text-sm text-slate-500 leading-snug">{card.desc}</p>
                                    </div>
                                    <span className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all text-lg flex-shrink-0">→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'tutors' && <TutorManagement />}
                {activeTab === 'students' && <StudentManagement />}
                {activeTab === 'subjects' && <SubjectManagement />}

                {activeTab === 'registrations' && (
                    <div className="glass-card p-4 md:p-8 bg-white border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Pending Registrations</h2>
                            <button onClick={fetchPayments} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition border border-slate-200">Refresh</button>
                        </div>

                        {/* Mobile card view */}
                        <div className="flex flex-col gap-4 md:hidden">
                            {registrationPayments.length === 0 && (
                                <p className="text-center text-slate-400 italic py-8">No pending registrations found.</p>
                            )}
                            {registrationPayments.map(p => (
                                <div key={p.PaymentID} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-900">{p.StudentName} <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">New</span></p>
                                            <p className="text-sm text-slate-500">{p.ParentName}</p>
                                        </div>
                                        <p className="font-mono font-bold text-slate-900">Rs. {p.Amount}</p>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>{p.Month}</span>
                                        <span>{new Date(p.PaymentDate).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono truncate">{p.ReferenceNo}</p>
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => handleVerify(p.PaymentID, 'Verified')} className="flex-1 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium">Approve</button>
                                        <button onClick={() => handleVerify(p.PaymentID, 'Rejected')} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium">Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table view */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="p-4 font-semibold text-sm">Ref No</th>
                                        <th className="p-4 font-semibold text-sm">Student</th>
                                        <th className="p-4 font-semibold text-sm">Parent</th>
                                        <th className="p-4 font-semibold text-sm">Month</th>
                                        <th className="p-4 font-semibold text-sm">Amount</th>
                                        <th className="p-4 font-semibold text-sm">Date</th>
                                        <th className="p-4 font-semibold text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {registrationPayments.map(p => (
                                        <tr key={p.PaymentID} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-600 font-mono text-sm">{p.ReferenceNo}</td>
                                            <td className="p-4 font-medium">{p.StudentName} <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">New</span></td>
                                            <td className="p-4 text-slate-500">{p.ParentName}</td>
                                            <td className="p-4">{p.Month}</td>
                                            <td className="p-4 font-mono font-medium text-slate-900">Rs. {p.Amount}</td>
                                            <td className="p-4 text-slate-400 text-sm">{new Date(p.PaymentDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-right space-x-3">
                                                <button onClick={() => handleVerify(p.PaymentID, 'Verified')} className="px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium shadow-sm">Approve</button>
                                                <button onClick={() => handleVerify(p.PaymentID, 'Rejected')} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium shadow-sm">Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {registrationPayments.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-400 italic">No pending registrations found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'fees' && (
                    <div className="glass-card p-4 md:p-8 bg-white border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Pending Monthly Fees</h2>
                            <button onClick={fetchPayments} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition border border-slate-200">Refresh</button>
                        </div>

                        {/* Mobile card view */}
                        <div className="flex flex-col gap-4 md:hidden">
                            {monthlyPayments.length === 0 && (
                                <p className="text-center text-slate-400 italic py-8">No pending monthly fees found.</p>
                            )}
                            {monthlyPayments.map(p => (
                                <div key={p.PaymentID} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-900">{p.StudentName}</p>
                                            <p className="text-sm text-slate-500">{p.ParentName}</p>
                                        </div>
                                        <p className="font-mono font-bold text-slate-900">Rs. {p.Amount}</p>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>{p.Month}</span>
                                        <span>{new Date(p.PaymentDate).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono truncate">{p.ReferenceNo}</p>
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => handleVerify(p.PaymentID, 'Verified')} className="flex-1 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium">Verify</button>
                                        <button onClick={() => handleVerify(p.PaymentID, 'Rejected')} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium">Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table view */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="p-4 font-semibold text-sm">Ref No</th>
                                        <th className="p-4 font-semibold text-sm">Student</th>
                                        <th className="p-4 font-semibold text-sm">Parent</th>
                                        <th className="p-4 font-semibold text-sm">Month</th>
                                        <th className="p-4 font-semibold text-sm">Amount</th>
                                        <th className="p-4 font-semibold text-sm">Date</th>
                                        <th className="p-4 font-semibold text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {monthlyPayments.map(p => (
                                        <tr key={p.PaymentID} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-600 font-mono text-sm">{p.ReferenceNo}</td>
                                            <td className="p-4 font-medium">{p.StudentName}</td>
                                            <td className="p-4 text-slate-500">{p.ParentName}</td>
                                            <td className="p-4">{p.Month}</td>
                                            <td className="p-4 font-mono font-medium text-slate-900">Rs. {p.Amount}</td>
                                            <td className="p-4 text-slate-400 text-sm">{new Date(p.PaymentDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-right space-x-3">
                                                <button onClick={() => handleVerify(p.PaymentID, 'Verified')} className="px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium shadow-sm">Verify</button>
                                                <button onClick={() => handleVerify(p.PaymentID, 'Rejected')} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium shadow-sm">Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {monthlyPayments.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-400 italic">No pending monthly fees found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'communication' && (
                    <div className="glass-card p-8 max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Make an Announcement</h3>
                        <form onSubmit={handlePostAnnouncement} className="space-y-6">
                            <div>
                                <label className="block text-sm text-slate-600 mb-2">Title</label>
                                <input
                                    value={annTitle}
                                    onChange={(e) => setAnnTitle(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500"
                                    placeholder="Announcement Title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-2">Content</label>
                                <textarea
                                    value={annContent}
                                    onChange={(e) => setAnnContent(e.target.value)}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-3 glass-input outline-none resize-none transition focus:ring-1 focus:ring-blue-500"
                                    placeholder="Write your announcement here..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-2">Target Audience</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <select value={annTarget} onChange={(e) => setAnnTarget(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                        <option value="All">All Users</option>
                                        <option value="Teachers">Teachers Only</option>
                                        <option value="Students">Students & Parents</option>
                                    </select>
                                    <select value={annGrade} onChange={(e) => setAnnGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                        <option value="All">All Grades</option>
                                        {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3.5 glass-button rounded-xl font-semibold transition shadow-lg shadow-blue-900/10">Post Announcement</button>
                        </form>
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="space-y-6">
                        {/* Sub-tabs */}
                        <div className="flex justify-center">
                            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
                                <button
                                    onClick={() => setTimetableMode('sessions')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition ${timetableMode === 'sessions' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 group'}`}
                                >
                                    📆 One-off Sessions
                                </button>
                                <button
                                    onClick={() => setTimetableMode('weekly')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition ${timetableMode === 'weekly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    🔄 Weekly Timetable
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Scheduler Form (Sessions) OR Filters (Weekly) */}
                            <div className="glass-card p-8 lg:col-span-1 h-fit bg-white border border-slate-200 shadow-sm">
                                {timetableMode === 'sessions' ? (
                                    <>
                                        <h3 className="text-xl font-bold text-slate-900 mb-6">Schedule Class</h3>
                                        <form onSubmit={handleScheduleClass} className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Grade</label>
                                                <select value={scheduleGrade} onChange={(e) => setScheduleGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                                    {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Subject</label>
                                                <select value={scheduleSubject} onChange={(e) => { setScheduleSubject(e.target.value); setScheduleTeacher(''); }} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.SubjectID} value={s.SubjectID}>{s.SubjectName}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Teacher</label>
                                                <select
                                                    value={scheduleTeacher}
                                                    onChange={(e) => setScheduleTeacher(e.target.value)}
                                                    className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500"
                                                    disabled={!scheduleSubject}
                                                >
                                                    <option value="">Select Teacher</option>
                                                    {tutors
                                                        .filter(t => !scheduleSubject || (t.SubjectIDs && t.SubjectIDs.includes(String(scheduleSubject))))
                                                        .map(t => (
                                                            <option key={t.TeacherID} value={t.TeacherID}>
                                                                {t.TeacherName} {t.Grades && t.Grades.length > 0 ? `(Gr ${t.Grades.join(', ')})` : ''}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Date</label>
                                                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" min={new Date().toISOString().split('T')[0]} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-slate-600 mb-2">Start Time</label>
                                                    <input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-600 mb-2">End Time</label>
                                                    <input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                            <button type="submit" className="w-full py-3.5 glass-button rounded-xl font-semibold transition shadow-lg shadow-blue-900/10 mt-4">Schedule Class</button>
                                        </form>
                                    </>
                                ) : (
                                    <>
                                        {/* Filters Panel for Weekly Mode */}
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-slate-900">Filters</h3>
                                            <button
                                                onClick={() => { setFilterGrade(''); setFilterSubject(''); setFilterTeacher(''); }}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Filter by Grade</label>
                                                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                                    <option value="">All Grades</option>
                                                    {[6, 7, 8, 9].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Filter by Subject</label>
                                                <select value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setFilterTeacher(''); }} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                                    <option value="">All Subjects</option>
                                                    {subjects.map(s => <option key={s.SubjectID} value={s.SubjectID}>{s.SubjectName}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-2">Filter by Teacher</label>
                                                <select
                                                    value={filterTeacher}
                                                    onChange={(e) => setFilterTeacher(e.target.value)}
                                                    className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500"
                                                    disabled={!filterSubject && false}
                                                >
                                                    <option value="">All Teachers</option>
                                                    {tutors
                                                        .filter(t => !filterSubject || (t.SubjectIDs && t.SubjectIDs.includes(String(filterSubject))))
                                                        .map(t => (
                                                            <option key={t.TeacherID} value={t.TeacherName}>{t.TeacherName}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Column: List */}
                            <div className="glass-card p-8 lg:col-span-2 bg-white border border-slate-200 shadow-sm relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">
                                        {timetableMode === 'sessions' ? 'Scheduled Sessions' : 'Weekly Schedule'}
                                    </h3>

                                    {timetableMode === 'sessions' ? (
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-slate-600">View Grade:</label>
                                            <select value={viewGrade} onChange={(e) => setViewGrade(e.target.value)} className="px-3 py-1.5 glass-input outline-none text-sm rounded-lg border border-slate-200">
                                                <option value="">All Grades</option>
                                                {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
                                        >
                                            <span className="text-lg">+</span> Add Weekly Slot
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {timetableMode === 'sessions' ? (
                                        sessions.length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                                No sessions scheduled{viewGrade ? ` for Grade ${viewGrade}` : ''}.
                                            </div>
                                        ) : (
                                            sessions.map(sess => (
                                                <div key={sess.SessionID} className="bg-white p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition flex justify-between items-center group shadow-sm">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-blue-600 font-bold text-lg">{sess.SubjectName}</span>
                                                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{new Date(sess.Date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-500">👨‍🏫 {sess.TeacherName}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-slate-900 font-mono font-medium">{sess.StartTime.slice(0, 5)} - {sess.EndTime.slice(0, 5)}</div>
                                                        <div className="text-xs text-slate-400 mt-1">{new Date(sess.Date).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    ) : (
                                        timetable.filter(tt => {
                                            const matchGrade = !filterGrade || String(tt.Grade) === String(filterGrade);
                                            // Resolve Subject Name for filtering since filterSubject is now ID
                                            const subjectNameFilter = filterSubject ? subjects.find(s => String(s.SubjectID) === String(filterSubject))?.SubjectName : null;
                                            const matchSubject = !subjectNameFilter || tt.SubjectName === subjectNameFilter;
                                            const matchTeacher = !filterTeacher || tt.TeacherName === filterTeacher;
                                            return matchGrade && matchSubject && matchTeacher;
                                        }).length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                                No weekly slots found matching filters.
                                            </div>
                                        ) : (
                                            timetable
                                                .filter(tt => {
                                                    const matchGrade = !filterGrade || String(tt.Grade) === String(filterGrade);
                                                    const subjectNameFilter = filterSubject ? subjects.find(s => String(s.SubjectID) === String(filterSubject))?.SubjectName : null;
                                                    const matchSubject = !subjectNameFilter || tt.SubjectName === subjectNameFilter;
                                                    const matchTeacher = !filterTeacher || tt.TeacherName === filterTeacher;
                                                    return matchGrade && matchSubject && matchTeacher;
                                                })
                                                .map(tt => (
                                                    <div key={tt.TimetableID} className="bg-white p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition flex justify-between items-center group shadow-sm">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="text-blue-600 font-bold text-lg">{tt.DayOfWeek}</span>
                                                                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-bold">Grade {tt.Grade}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600"><span className="font-semibold">{tt.SubjectName}</span> with <span className="text-slate-500">{tt.TeacherName}</span></p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-slate-900 font-mono font-medium">{tt.StartTime.slice(0, 5)} - {tt.EndTime.slice(0, 5)}</div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteTimetable(tt.TimetableID)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for Adding Weekly Slot */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">Add Weekly Slot</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={(e) => { handleAddToTimetable(e); setShowModal(false); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2">Grade</label>
                                    <select value={scheduleGrade} onChange={(e) => setScheduleGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                        {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2">Subject</label>
                                    <select value={scheduleSubject} onChange={(e) => { setScheduleSubject(e.target.value); setScheduleTeacher(''); }} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.SubjectID} value={s.SubjectID}>{s.SubjectName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2">Teacher</label>
                                    <select
                                        value={scheduleTeacher}
                                        onChange={(e) => setScheduleTeacher(e.target.value)}
                                        className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500"
                                        disabled={!scheduleSubject}
                                    >
                                        <option value="">Select Teacher</option>
                                        {tutors
                                            .filter(t => !scheduleSubject || (t.SubjectIDs && t.SubjectIDs.includes(String(scheduleSubject))))
                                            .map(t => (
                                                <option key={t.TeacherID} value={t.TeacherID}>
                                                    {t.TeacherName} {t.Grades && t.Grades.length > 0 ? `(Gr ${t.Grades.join(', ')})` : ''}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2">Day of Week</label>
                                    <select value={ttDay} onChange={(e) => setTtDay(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-2">Start Time</label>
                                        <input type="time" value={ttStart} onChange={(e) => setTtStart(e.target.value)} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-2">End Time</label>
                                        <input type="time" value={ttEnd} onChange={(e) => setTtEnd(e.target.value)} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3.5 glass-button rounded-xl font-semibold transition shadow-lg shadow-blue-900/10 mt-4">Add to Timetable</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            <BottomNav
                items={adminNavItems}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    );
};

export default AdminDashboard;
