import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import TutorManagement from './TutorManagement';
import StudentManagement from './StudentManagement';
import SubjectManagement from './SubjectManagement';
import api from '../../api/axios';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [pendingPayments, setPendingPayments] = useState([]);

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
        // Fetch payments on mount to populate counts for all tabs
        fetchPayments();
    }, []);

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
            alert("Class Scheduled Successfully!");
            fetchSessions(); // Refresh list
        } catch (err) {
            alert("Error scheduling class");
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
            alert("Timetable Updated!");
            fetchTimetable();
        } catch (err) {
            alert("Error updating timetable");
        }
    };

    const handleDeleteTimetable = async (id) => {
        if (!confirm("Are you sure you want to remove this slot?")) return;
        try {
            await api.delete(`/academic/timetable/${id}`);
            fetchTimetable();
        } catch (err) { alert("Error deleting slot"); }
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
            alert(`Payment ${status}`);
            fetchPayments(); // Refresh
        } catch (err) {
            alert("Error updating payment");
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
            alert("Announcement Posted");
            setAnnTitle(''); setAnnContent(''); setAnnTarget('All'); setAnnGrade('All');
        } catch (err) { alert("Error posting announcement"); }
    };

    return (
        <div className="min-h-screen p-8 transition-colors duration-300 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
                {/* Header */}
                <div className="glass-card p-4 md:p-6 flex flex-row justify-between items-center bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg relative overflow-hidden rounded-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10 min-w-0">
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight truncate">Admin Dashboard</h1>
                        <p className="text-cyan-100 mt-0.5 text-sm truncate">Welcome, {user?.name}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex-shrink-0 ml-3 px-3 md:px-6 py-2 md:py-2.5 bg-white text-cyan-700 border border-white/20 hover:bg-cyan-50 rounded-xl transition font-bold shadow-sm text-sm"
                    >
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-8 cursor-pointer hover:bg-white transition group bg-white border border-blue-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 rounded-2xl relative overflow-hidden" onClick={() => setActiveTab('tutors')}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner shadow-blue-100">
                                👨‍🏫
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">Manage Users</h3>
                            <p className="text-slate-500 relative z-10">Add or edit Tutors and Students profiles.</p>
                        </div>
                        <div className="glass-card p-8 cursor-pointer hover:bg-white transition group bg-white border border-blue-100 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 rounded-2xl relative overflow-hidden" onClick={() => setActiveTab('fees')}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner shadow-emerald-100 relative">
                                💰
                                {monthlyPayments.length > 0 && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-lg animate-bounce">
                                        {monthlyPayments.length}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">Fee Management</h3>
                            <p className="text-slate-500 relative z-10">Verify monthly payments.</p>
                        </div>
                        <div className="glass-card p-8 cursor-pointer hover:bg-white transition group bg-white border border-blue-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 rounded-2xl relative overflow-hidden" onClick={() => setActiveTab('registrations')}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner shadow-blue-100 relative">
                                📝
                                {registrationPayments.length > 0 && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-lg animate-bounce">
                                        {registrationPayments.length}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">Registrations</h3>
                            <p className="text-slate-500 relative z-10">Verify new student registrations.</p>
                        </div>
                        <div className="glass-card p-8 cursor-pointer hover:bg-white transition group bg-white border border-blue-100 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-300 rounded-2xl relative overflow-hidden" onClick={() => setActiveTab('communication')}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner shadow-amber-100">
                                📢
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">Announcements</h3>
                            <p className="text-slate-500 relative z-10">Post updates and news to all users.</p>
                        </div>
                        <div className="glass-card p-8 cursor-pointer hover:bg-white transition group bg-white border border-blue-100 shadow-sm hover:shadow-lg hover:shadow-pink-500/10 hover:border-pink-300 rounded-2xl relative overflow-hidden" onClick={() => setActiveTab('subjects')}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-pink-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner shadow-pink-100">
                                📚
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Manage Subjects</h3>
                            <p className="text-slate-500">Add or edit system subjects.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'tutors' && <TutorManagement />}
                {activeTab === 'students' && <StudentManagement />}
                {activeTab === 'subjects' && <SubjectManagement />}

                {activeTab === 'registrations' && (
                    <div className="glass-card p-8 bg-white border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Pending Registrations</h2>
                            <button onClick={fetchPayments} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition border border-slate-200">Refresh</button>
                        </div>

                        <div className="overflow-x-auto">
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
                    <div className="glass-card p-8 bg-white border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Pending Monthly Fees</h2>
                            <button onClick={fetchPayments} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition border border-slate-200">Refresh</button>
                        </div>

                        <div className="overflow-x-auto">
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
                                <div className="grid grid-cols-2 gap-4">
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
        </div>
    );
};

export default AdminDashboard;
