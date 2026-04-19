import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import TutorManagement from './TutorManagement';
import StudentManagement from './StudentManagement';
import SubjectManagement from './SubjectManagement';
import PageHeader from '../../components/PageHeader';
import BottomNav from '../../components/BottomNav';
import api from '../../api/axios';
import SkeletonCard, { SkeletonStat } from '../../components/SkeletonCard';
import EmptyState from '../../components/EmptyState';

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
    const [showModal, setShowModal] = useState(false);

    // Isolated modal state — separate from the session scheduler form
    const [modalGrade, setModalGrade] = useState('6');
    const [modalSubject, setModalSubject] = useState('');
    const [modalTeacher, setModalTeacher] = useState('');
    const [modalDay, setModalDay] = useState('Monday');
    const [modalStart, setModalStart] = useState('');
    const [modalEnd, setModalEnd] = useState('');

    // Payments filter
    const [payTypeFilter, setPayTypeFilter] = useState('all'); // 'all' | 'registration' | 'fees'

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
                subjectId: modalSubject,
                grade: modalGrade,
                teacherId: modalTeacher,
                dayOfWeek: modalDay,
                startTime: modalStart,
                endTime: modalEnd
            });
            toast.success("Timetable updated!");
            fetchTimetable();
            setShowModal(false);
        } catch (err) {
            toast.error("Error updating timetable");
        }
    };

    const openAddSlotModal = () => {
        setModalGrade('6');
        setModalSubject(subjects[0]?.SubjectID || '');
        setModalTeacher('');
        setModalDay('Monday');
        setModalStart('');
        setModalEnd('');
        setShowModal(true);
    };

    const getSLDate = () => {
        const SL_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
        return new Date(Date.now() + SL_OFFSET_MS).toISOString().split('T')[0];
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
        { id: 'payments', label: 'Payments', icon: '💰', badge: pendingPayments.length },
        { id: 'manage', label: 'Manage', icon: '👥', badge: 0, matchTabs: ['tutors', 'students', 'subjects'] },
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
                    {['overview', 'tutors', 'students', 'subjects', 'payments', 'communication', 'timetable'].map(tab => {
                        let label = tab.charAt(0).toUpperCase() + tab.slice(1);
                        let count = 0;

                        if (tab === 'payments') {
                            label = 'Payments';
                            count = pendingPayments.length;
                        }

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                aria-current={activeTab === tab ? 'page' : undefined}
                                className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 capitalize whitespace-nowrap flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === tab ? 'glass-button bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'}`}
                            >
                                {label}
                                {count > 0 && (
                                    <span aria-hidden="true" className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm motion-safe:animate-pulse">
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
                        {!stats ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                <SkeletonStat count={6} />
                            </div>
                        ) : null}
                        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${!stats ? 'hidden' : ''}`}>
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
                                        <span className="text-2xl" aria-hidden="true">{s.icon}</span>
                                        {s.alert && <span className="w-2 h-2 bg-red-500 rounded-full motion-safe:animate-pulse" aria-label="Needs attention" role="img"></span>}
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
                                <button
                                    key={i}
                                    onClick={() => setActiveTab(card.tab)}
                                    aria-label={card.badge > 0 ? `${card.title}, ${card.badge} pending` : card.title}
                                    className="bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex items-start gap-4 relative overflow-hidden text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <div className={`w-12 h-12 ${card.emoji_bg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform relative`} aria-hidden="true">
                                        {card.icon}
                                        {card.badge > 0 && (
                                            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow motion-safe:animate-pulse">
                                                {card.badge}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 text-base mb-0.5">{card.title}</h3>
                                        <p className="text-sm text-slate-500 leading-snug">{card.desc}</p>
                                    </div>
                                    <span className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all text-lg flex-shrink-0" aria-hidden="true">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'tutors' && <TutorManagement />}
                {activeTab === 'students' && <StudentManagement />}
                {activeTab === 'subjects' && <SubjectManagement />}

                {activeTab === 'manage' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">Manage</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { icon: '👨‍🏫', title: 'Tutors', desc: 'Add and manage teaching staff.', tab: 'tutors', color: 'blue' },
                                { icon: '🎓', title: 'Students', desc: 'View and manage enrolled students.', tab: 'students', color: 'indigo' },
                                { icon: '📚', title: 'Subjects', desc: 'Add or edit system subjects.', tab: 'subjects', color: 'amber' },
                            ].map(card => (
                                <div key={card.tab} onClick={() => setActiveTab(card.tab)}
                                    className="bg-white border border-slate-100 rounded-2xl p-8 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center gap-4 text-center group">
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg mb-1">{card.title}</h3>
                                        <p className="text-sm text-slate-500">{card.desc}</p>
                                    </div>
                                    <span className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-lg">→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (() => {
                    const filtered = payTypeFilter === 'registration' ? registrationPayments
                        : payTypeFilter === 'fees' ? monthlyPayments
                        : pendingPayments;
                    const primaryLabel = (p) => p.IsApproved ? 'Verify' : 'Approve';
                    return (
                        <div className="glass-card p-4 md:p-8 bg-white border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Pending Payments</h2>
                                <div className="flex items-center gap-2">
                                    {/* Type filter pills */}
                                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-bold">
                                        {[['all', 'All', pendingPayments.length], ['registration', 'Registrations', registrationPayments.length], ['fees', 'Monthly Fees', monthlyPayments.length]].map(([val, label, cnt]) => (
                                            <button key={val} onClick={() => setPayTypeFilter(val)}
                                                className={`px-3 py-1.5 rounded-md transition ${payTypeFilter === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                                {label}{cnt > 0 ? ` (${cnt})` : ''}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={fetchPayments} aria-label="Refresh payments" className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-hidden="false"><span aria-hidden="true">↻</span></button>
                                </div>
                            </div>

                            {/* Mobile card view */}
                            <div className="flex flex-col gap-4 md:hidden">
                                {filtered.length === 0 && (
                                    <EmptyState icon="✅" title="All Clear!" subtitle="No pending payments at the moment." />
                                )}
                                {filtered.map(p => (
                                    <div key={p.PaymentID} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {p.StudentName}
                                                    {!p.IsApproved && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">New</span>}
                                                </p>
                                                <p className="text-sm text-slate-500">{p.ParentName}</p>
                                            </div>
                                            <p className="font-mono font-bold text-slate-900">Rs. {p.Amount}</p>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{p.Month}</span>
                                            <span>{new Date(p.PaymentDate).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono truncate">Ref: {p.ReferenceNo}</p>
                                        {p.ReceiptFile && (
                                            <a href={`${import.meta.env.VITE_API_URL || '/api'}/uploads/${p.ReceiptFile}`} target="_blank" rel="noreferrer"
                                                className="text-xs text-blue-500 underline truncate block">📎 View Receipt</a>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => handleVerify(p.PaymentID, 'Verified')} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-bold">{primaryLabel(p)}</button>
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
                                            <th className="p-4 font-semibold text-sm">Type</th>
                                            <th className="p-4 font-semibold text-sm">Student</th>
                                            <th className="p-4 font-semibold text-sm">Parent</th>
                                            <th className="p-4 font-semibold text-sm">Month</th>
                                            <th className="p-4 font-semibold text-sm">Amount</th>
                                            <th className="p-4 font-semibold text-sm">Date</th>
                                            <th className="p-4 font-semibold text-sm text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700">
                                        {filtered.length === 0 && (
                                            <tr><td colSpan="7" className="py-12">
                                                <EmptyState icon="✅" title="All Clear!" subtitle="No pending payments at the moment." />
                                            </td></tr>
                                        )}
                                        {filtered.map(p => (
                                            <tr key={p.PaymentID} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                                <td className="p-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.IsApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                        {p.IsApproved ? 'Monthly' : 'Registration'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium">{p.StudentName}</td>
                                                <td className="p-4 text-slate-500">{p.ParentName}</td>
                                                <td className="p-4">{p.Month}</td>
                                                <td className="p-4 font-mono font-medium text-slate-900">Rs. {p.Amount}</td>
                                                <td className="p-4">
                                                    <div className="text-slate-400 text-sm">{new Date(p.PaymentDate).toLocaleDateString()}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{p.ReferenceNo}</div>
                                                    {p.ReceiptFile && (
                                                        <a href={`${import.meta.env.VITE_API_URL || '/api'}/uploads/${p.ReceiptFile}`} target="_blank" rel="noreferrer"
                                                            className="text-xs text-blue-500 underline">📎 Receipt</a>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    <button onClick={() => handleVerify(p.PaymentID, 'Verified')} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-bold shadow-sm">{primaryLabel(p)}</button>
                                                    <button onClick={() => handleVerify(p.PaymentID, 'Rejected')} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium shadow-sm">Reject</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}

                {activeTab === 'communication' && (
                    <div className="glass-card p-5 md:p-8 max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Make an Announcement</h3>
                        <form onSubmit={handlePostAnnouncement} className="space-y-6">
                            <div>
                                <label htmlFor="ann-title" className="block text-sm text-slate-600 mb-2">Title</label>
                                <input
                                    id="ann-title"
                                    value={annTitle}
                                    onChange={(e) => setAnnTitle(e.target.value)}
                                    required
                                    aria-required="true"
                                    className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500"
                                    placeholder="Announcement Title"
                                />
                            </div>
                            <div>
                                <label htmlFor="ann-content" className="block text-sm text-slate-600 mb-2">Content</label>
                                <textarea
                                    id="ann-content"
                                    value={annContent}
                                    onChange={(e) => setAnnContent(e.target.value)}
                                    required
                                    aria-required="true"
                                    rows="4"
                                    className="w-full px-4 py-3 glass-input outline-none resize-none transition focus-visible:ring-2 focus-visible:ring-blue-500"
                                    placeholder="Write your announcement here..."
                                />
                            </div>
                            <div>
                                <label htmlFor="ann-target" className="block text-sm text-slate-600 mb-2">Target Audience</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <select id="ann-target" value={annTarget} onChange={(e) => setAnnTarget(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                        <option value="All">All Users</option>
                                        <option value="Teachers">Teachers Only</option>
                                        <option value="Students">Students &amp; Parents</option>
                                    </select>
                                    <label htmlFor="ann-grade" className="sr-only">Grade</label>
                                    <select id="ann-grade" value={annGrade} onChange={(e) => setAnnGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                        <option value="All">All Grades</option>
                                        {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3.5 glass-button rounded-xl font-semibold transition shadow-lg shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Post Announcement</button>
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
                                    aria-pressed={timetableMode === 'sessions'}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${timetableMode === 'sessions' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <span aria-hidden="true">📆 </span>One-off Sessions
                                </button>
                                <button
                                    onClick={() => setTimetableMode('weekly')}
                                    aria-pressed={timetableMode === 'weekly'}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${timetableMode === 'weekly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <span aria-hidden="true">🔄 </span>Weekly Timetable
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
                                                <label htmlFor="sch-grade" className="block text-sm text-slate-600 mb-2">Grade</label>
                                                <select id="sch-grade" value={scheduleGrade} onChange={(e) => setScheduleGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                                    {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="sch-subject" className="block text-sm text-slate-600 mb-2">Subject</label>
                                                <select id="sch-subject" value={scheduleSubject} onChange={(e) => { setScheduleSubject(e.target.value); setScheduleTeacher(''); }} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.SubjectID} value={s.SubjectID}>{s.SubjectName}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="sch-teacher" className="block text-sm text-slate-600 mb-2">Teacher</label>
                                                <select
                                                    id="sch-teacher"
                                                    value={scheduleTeacher}
                                                    onChange={(e) => setScheduleTeacher(e.target.value)}
                                                    className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:text-slate-400 disabled:bg-slate-50"
                                                    disabled={!scheduleSubject}
                                                    aria-disabled={!scheduleSubject}
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
                                                <label htmlFor="sch-date" className="block text-sm text-slate-600 mb-2">Date</label>
                                                <input id="sch-date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} required aria-required="true" className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500" min={getSLDate()} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="sch-start" className="block text-sm text-slate-600 mb-2">Start Time</label>
                                                    <input id="sch-start" type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} required aria-required="true" className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500" />
                                                </div>
                                                <div>
                                                    <label htmlFor="sch-end" className="block text-sm text-slate-600 mb-2">End Time</label>
                                                    <input id="sch-end" type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} required aria-required="true" className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500" />
                                                </div>
                                            </div>
                                            <button type="submit" className="w-full py-3.5 glass-button rounded-xl font-semibold transition shadow-lg shadow-blue-900/10 mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Schedule Class</button>
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
                                            onClick={openAddSlotModal}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
                                        >
                                            <span className="text-lg">+</span> Add Weekly Slot
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4 max-h-[350px] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {timetableMode === 'sessions' ? (
                                        sessions.length === 0 ? (
                                            <EmptyState
                                                icon="📆"
                                                title={`No Sessions Scheduled${viewGrade ? ` for Grade ${viewGrade}` : ''}`}
                                                subtitle="Use the form on the left to schedule a one-off class."
                                            />
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
                                            <EmptyState
                                                icon="🔄"
                                                title="No Weekly Slots Found"
                                                subtitle="Try adjusting the filters, or click '+ Add Weekly Slot' to get started."
                                            />
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
                                                                aria-label={`Delete ${tt.SubjectName} slot on ${tt.DayOfWeek}`}
                                                                className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition md:opacity-0 md:group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:opacity-100"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 motion-safe:animate-fade-in">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="timetable-modal-title"
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto motion-safe:animate-scale-up"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 id="timetable-modal-title" className="text-xl font-bold text-slate-900">Add Weekly Slot</h3>
                            <button onClick={() => setShowModal(false)} aria-label="Close modal" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleAddToTimetable} className="space-y-4">
                                <div>
                                    <label htmlFor="modal-grade" className="block text-sm text-slate-600 mb-2">Grade</label>
                                    <select id="modal-grade" value={modalGrade} onChange={(e) => setModalGrade(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                        {[6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="modal-subject" className="block text-sm text-slate-600 mb-2">Subject</label>
                                    <select id="modal-subject" value={modalSubject} onChange={(e) => { setModalSubject(e.target.value); setModalTeacher(''); }} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.SubjectID} value={s.SubjectID}>{s.SubjectName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="modal-teacher" className="block text-sm text-slate-600 mb-2">Teacher</label>
                                    <select
                                        id="modal-teacher"
                                        value={modalTeacher}
                                        onChange={(e) => setModalTeacher(e.target.value)}
                                        className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:text-slate-400 disabled:bg-slate-50"
                                        disabled={!modalSubject}
                                        aria-disabled={!modalSubject}
                                    >
                                        <option value="">Select Teacher</option>
                                        {tutors
                                            .filter(t => !modalSubject || (t.SubjectIDs && t.SubjectIDs.includes(String(modalSubject))))
                                            .map(t => (
                                                <option key={t.TeacherID} value={t.TeacherID}>
                                                    {t.TeacherName} {t.Grades && t.Grades.length > 0 ? `(Gr ${t.Grades.join(', ')})` : ''}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="modal-day" className="block text-sm text-slate-600 mb-2">Day of Week</label>
                                    <select id="modal-day" value={modalDay} onChange={(e) => setModalDay(e.target.value)} className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="modal-start" className="block text-sm text-slate-600 mb-2">Start Time</label>
                                        <input id="modal-start" type="time" value={modalStart} onChange={(e) => setModalStart(e.target.value)} required aria-required="true" className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-end" className="block text-sm text-slate-600 mb-2">End Time</label>
                                        <input id="modal-end" type="time" value={modalEnd} onChange={(e) => setModalEnd(e.target.value)} required aria-required="true" className="w-full px-4 py-3 glass-input outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3.5 glass-button rounded-xl font-semibold transition shadow-lg shadow-blue-900/10 mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Add to Timetable</button>
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
