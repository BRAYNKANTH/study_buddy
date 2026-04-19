import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import QRScanner from '../../components/QRScanner';
import StudentDetailModal from '../../components/StudentDetailModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ClassView = ({ subject, grade, onBack, onNavigateToChat }) => {
    const [activeTab, setActiveTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [showScanner, setShowScanner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Session State
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [newSession, setNewSession] = useState({ date: '', startTime: '', endTime: '' });

    const [materials, setMaterials] = useState([]);

    // Material State
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ title: '', description: '', file: null });

    // Exam State
    const [exams, setExams] = useState([]);
    const [showExamModal, setShowExamModal] = useState(false);
    const [newExam, setNewExam] = useState({ name: '', term: 'Term 1', date: '' });
    const [selectedExamForMarks, setSelectedExamForMarks] = useState(null); // For entering marks
    const [marksData, setMarksData] = useState({}); // { studentId: { marks: 0, remarks: '' } }

    useEffect(() => {
        fetchClassData();
    }, [subject, grade]);

    const fetchClassData = async () => {
        setLoading(true);
        try {
            const [stdRes, sessRes, matRes, examRes] = await Promise.all([
                api.get(`/attendance/teacher/class/${subject.SubjectID}/${grade}/students`),
                api.get(`/attendance/teacher/sessions/${subject.SubjectID}/${grade}`),
                api.get(`/academic/materials/${subject.SubjectID}?grade=${grade}`),
                api.get(`/academic/exams?subjectId=${subject.SubjectID}&grade=${grade}`)
            ]);
            setStudents(stdRes.data);
            setSessions(sessRes.data);
            setMaterials(matRes.data);
            setExams(examRes.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleCreateExam = async (e) => {
        e.preventDefault();
        try {
            await api.post('/academic/exams', {
                examName: newExam.name,
                term: newExam.term,
                date: newExam.date,
                subjectId: subject.SubjectID,
                grade: grade
            });
            setShowExamModal(false);
            setNewExam({ name: '', term: 'Term 1', date: '' });
            fetchClassData();
            toast.success("Exam Created!");
        } catch (err) {
            toast.error("Failed to create exam");
        }
    };

    const handleSaveMarks = async () => {
        if (!selectedExamForMarks) return;

        const payload = Object.entries(marksData).map(([sId, data]) => ({
            studentId: sId,
            marks: (data.marks === '' || isNaN(parseInt(data.marks))) ? 0 : parseInt(data.marks),
            remarks: data.remarks
        }));

        try {
            await api.post('/academic/marks/batch', {
                examId: selectedExamForMarks.ExamID,
                subjectId: subject.SubjectID,
                marksData: payload
            });
            toast.success("Marks Saved Successfully!");
            setSelectedExamForMarks(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save marks");
        }
    };

    const handleUploadMaterial = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('subjectId', subject.SubjectID);
        formData.append('grade', grade);
        formData.append('title', newMaterial.title);
        formData.append('description', newMaterial.description);
        formData.append('file', newMaterial.file);

        try {
            await api.post('/academic/materials', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowMaterialModal(false);
            setNewMaterial({ title: '', description: '', file: null });
            fetchClassData(); // Refresh all
            toast.success("Material Uploaded!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload material");
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            await api.post('/attendance/teacher/session', {
                subjectId: subject.SubjectID,
                grade: grade,
                date: newSession.date,
                startTime: newSession.startTime,
                endTime: newSession.endTime
            });
            setShowSessionModal(false);
            fetchClassData(); // Refresh
        } catch (err) {
            toast.error('Failed to create session');
        }
    };

    // QR Scanning Logic
    const [scanningSessionId, setScanningSessionId] = useState(null);
    const handleScanClick = (sessionId) => {
        setScanningSessionId(sessionId);
        setShowScanner(true);
    };

    const handleScan = async (decodedText) => {
        if (!scanningSessionId) return;
        try {
            const res = await api.post('/attendance/mark', {
                studentId: decodedText,
                subjectId: subject.SubjectID,
                sessionId: scanningSessionId,
                status: 'Present'
            });
            toast.success(`Attendance Marked for ${res.data.studentName}!`);
        } catch (err) {
            toast.error("Failed to mark: " + (err.response?.data?.message || err.message));
        }
    };

    // View Session Attendance Logic
    const [viewSession, setViewSession] = useState(null);
    const [viewSessionLoading, setViewSessionLoading] = useState(false);
    const [viewSessionStudents, setViewSessionStudents] = useState([]);

    const handleViewAttendance = async (session) => {
        if (session.IsVirtual) {
            toast.error("This is a planned session. Attendance hasn't been marked yet.");
            return;
        }
        setViewSession(session);
        setViewSessionLoading(true);
        try {
            const res = await api.get(`/attendance/teacher/session/${session.SessionID}/students`);
            setViewSessionStudents(res.data);
            setViewSessionLoading(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch attendance list.");
            setViewSessionLoading(false);
            setViewSession(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white rounded-lg transition text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{subject.SubjectName}</h2>
                        <span className="text-blue-600 font-mono text-sm font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Grade {grade}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'students' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        Students
                    </button>
                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'sessions' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab('materials')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'materials' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        Materials
                    </button>
                    <button
                        onClick={() => setActiveTab('exams')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'exams' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                    >
                        Exams & Marks
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="glass-card p-6 min-h-[500px] bg-white border border-slate-200 shadow-sm">
                {loading ? <p className="text-slate-400 text-center py-10">Loading class data...</p> : (
                    <>
                        {activeTab === 'students' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">Enrolled Students ({students.length})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="pro-table">
                                        <thead>
                                            <tr>
                                                <th>Student ID</th>
                                                <th>Name</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(s => (
                                                <tr key={s.StudentID}>
                                                    <td className="font-mono text-neutral-500">{s.StudentID}</td>
                                                    <td className="font-medium text-neutral-900">{s.StudentName}</td>
                                                    <td className="text-right">
                                                        <button
                                                            onClick={() => setSelectedStudent(s)}
                                                            className="text-neutral-600 hover:text-black text-xs px-3 py-1.5 bg-neutral-100 rounded border border-neutral-200 hover:border-neutral-300 transition font-medium"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && (
                                                <tr>
                                                    <td colSpan="3" className="py-8 text-center text-neutral-500">No students enrolled.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">Class Sessions</h3>
                                    <button
                                        onClick={() => setShowSessionModal(true)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg shadow-lg hover:shadow-blue-500/20 transition font-bold"
                                    >
                                        + New Session
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {sessions.map(sess => (
                                        <div key={sess.SessionID} className={`p-4 bg-white border rounded-xl flex justify-between items-center transition shadow-sm hover:shadow-md ${sess.IsVirtual ? 'border-dashed border-slate-300' : 'border-slate-200 hover:border-blue-400'}`}>
                                            <div>
                                                <div className="text-slate-900 font-bold flex items-center gap-2">
                                                    {new Date(sess.Date).toLocaleDateString()}
                                                    {sess.IsVirtual && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wide">Scheduled</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{sess.StartTime.slice(0, 5)} - {sess.EndTime.slice(0, 5)}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                {!sess.IsVirtual && (
                                                    <button
                                                        onClick={() => handleViewAttendance(sess)}
                                                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm rounded-lg transition border border-slate-200 font-medium"
                                                    >
                                                        View List
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleScanClick(sess.SessionID)}
                                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm rounded-lg transition border border-blue-200 font-bold flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                                    Scan
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {sessions.length === 0 && <p className="text-slate-500 text-center py-8">No sessions created yet.</p>}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'materials' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Study Materials</h3>
                            <button
                                onClick={() => setShowMaterialModal(true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg shadow-lg hover:shadow-blue-500/20 transition font-bold"
                            >
                                + Upload Material
                            </button>
                        </div>
                        <div className="space-y-3">
                            {materials.map(mat => (
                                <div key={mat.MaterialID} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center transition hover:shadow-md hover:border-blue-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{mat.Title}</div>
                                            <div className="text-xs text-slate-500">{mat.Description || 'No description'} • {new Date(mat.UploadDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <a
                                        href={`${API_URL}/academic/materials/download/${mat.FileName}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg text-sm font-medium transition"
                                    >
                                        Download
                                    </a>
                                </div>
                            ))}
                            {materials.length === 0 && <p className="text-slate-500 text-center py-8">No materials uploaded.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div>
                        {!selectedExamForMarks ? (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">Exams</h3>
                                    <button
                                        onClick={() => setShowExamModal(true)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg shadow-lg hover:shadow-blue-500/20 transition font-bold"
                                    >
                                        + Create Exam
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {exams.map(ex => (
                                        <div key={ex.ExamID} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center transition hover:shadow-md hover:border-blue-300">
                                            <div>
                                                <div className="text-slate-900 font-bold">{ex.ExamName}</div>
                                                <div className="text-xs text-slate-500">{ex.Term} • {new Date(ex.Date).toLocaleDateString()}</div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    setSelectedExamForMarks(ex);
                                                    // Initialize marks data
                                                    const initialMarks = {};
                                                    students.forEach(s => initialMarks[s.StudentID] = { marks: '', remarks: '' });
                                                    
                                                    try {
                                                        const res = await api.get(`/academic/marks/exam/${ex.ExamID}`);
                                                        res.data.forEach(m => {
                                                            if (initialMarks[m.StudentID]) {
                                                                initialMarks[m.StudentID] = { marks: m.Marks, remarks: m.Remarks || '' };
                                                            }
                                                        });
                                                    } catch (err) {
                                                        console.error("Failed to fetch existing marks", err);
                                                    }
                                                    
                                                    setMarksData(initialMarks);
                                                }}
                                                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg text-sm font-bold transition"
                                            >
                                                Enter Marks
                                            </button>
                                        </div>
                                    ))}
                                    {exams.length === 0 && <p className="text-slate-500 text-center py-8">No exams created yet.</p>}
                                </div>
                            </>
                        ) : (
                            // Enter Marks View
                            <div className="animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-4">
                                    <button onClick={() => setSelectedExamForMarks(null)} className="text-slate-400 hover:text-slate-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <h3 className="text-lg font-bold text-slate-900">Entering Marks for: <span className="text-blue-600">{selectedExamForMarks.ExamName}</span></h3>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                            <tr>
                                                <th className="py-3 px-4">Student</th>
                                                <th className="py-3 px-4 w-32">Marks (0-100)</th>
                                                <th className="py-3 px-4">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(s => (
                                                <tr key={s.StudentID} className="border-b border-slate-100">
                                                    <td className="py-3 px-4 font-medium text-slate-900">{s.StudentName}</td>
                                                    <td className="py-3 px-4">
                                                        <input
                                                            type="number" min="0" max="100"
                                                            className="w-20 p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                            value={marksData[s.StudentID]?.marks || ''}
                                                            onChange={e => setMarksData(prev => ({ ...prev, [s.StudentID]: { ...prev[s.StudentID], marks: e.target.value } }))}
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <input
                                                            type="text" placeholder="Good, Excellent..."
                                                            className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                            value={marksData[s.StudentID]?.remarks || ''}
                                                            onChange={e => setMarksData(prev => ({ ...prev, [s.StudentID]: { ...prev[s.StudentID], remarks: e.target.value } }))}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                        <button
                                            onClick={handleSaveMarks}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition"
                                        >
                                            Save Marks
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Session Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="glass-card p-6 w-full max-w-sm bg-white border border-slate-200 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Session</h3>
                        <form onSubmit={handleCreateSession} className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Date</label>
                                <input type="date" required className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={newSession.date} onChange={e => setNewSession({ ...newSession, date: e.target.value })} />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1 font-medium">Start</label>
                                    <input type="time" required className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={newSession.startTime} onChange={e => setNewSession({ ...newSession, startTime: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1 font-medium">End</label>
                                    <input type="time" required className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={newSession.endTime} onChange={e => setNewSession({ ...newSession, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowSessionModal(false)} className="flex-1 py-2 text-slate-500 hover:text-slate-900 font-medium transition">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-lg transition">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Exam Modal */}
            {showExamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="glass-card p-6 w-full max-w-sm bg-white border border-slate-200 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Exam</h3>
                        <form onSubmit={handleCreateExam} className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Exam Name</label>
                                <input type="text" required placeholder="e.g. Mid-Term Test" className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={newExam.name} onChange={e => setNewExam({ ...newExam, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Term</label>
                                <select className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={newExam.term} onChange={e => setNewExam({ ...newExam, term: e.target.value })}
                                >
                                    <option>Term 1</option>
                                    <option>Term 2</option>
                                    <option>Term 3</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Date</label>
                                <input type="date" required className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={newExam.date} onChange={e => setNewExam({ ...newExam, date: e.target.value })} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowExamModal(false)} className="flex-1 py-2 text-slate-500 hover:text-slate-900 font-medium transition">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-lg transition">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Material Modal */}
            {showMaterialModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="glass-card p-6 w-full max-w-md bg-white border border-slate-200 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Upload Study Material</h3>
                        <form onSubmit={handleUploadMaterial} className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Title</label>
                                <input type="text" required placeholder="e.g. Algebra Worksheet 1" className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={newMaterial.title} onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Description</label>
                                <textarea placeholder="Optional description..." className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none h-20"
                                    value={newMaterial.description} onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">File (PDF/Image)</label>
                                <input type="file" required className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    onChange={e => setNewMaterial({ ...newMaterial, file: e.target.files[0] })} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowMaterialModal(false)} className="flex-1 py-2 text-slate-500 hover:text-slate-900 font-medium transition">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-lg transition">Upload</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showScanner && <QRScanner onScanPromise={handleScan} onClose={() => setShowScanner(false)} />}

            {/* Student Detail Modal */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    subjectId={subject.SubjectID}
                    onClose={() => setSelectedStudent(null)}
                    onNavigateToChat={onNavigateToChat}
                />
            )}

            {/* View Session Attendance Modal */}
            {viewSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setViewSession(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">✕</button>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Attendance List</h3>
                        <p className="text-slate-500 text-sm mb-4">
                            {new Date(viewSession.Date).toLocaleDateString()} • {viewSession.StartTime.slice(0, 5)}
                        </p>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar border-t border-slate-100">
                            {viewSessionLoading ? <p className="text-center py-8 text-slate-400">Loading attendees...</p> : (
                                <table className="w-full text-left text-sm text-slate-600 mt-2">
                                    <tbody>
                                        {viewSessionStudents.map((s, i) => (
                                            <tr key={s.AttendanceID} className="border-b border-slate-50 hover:bg-slate-50">
                                                <td className="py-2.5 pl-2 font-mono text-xs text-slate-400 w-10">{i + 1}</td>
                                                <td className="py-2.5 font-medium text-slate-900">{s.StudentName}</td>
                                                <td className="py-2.5 text-right pr-2">
                                                    <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Present</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {viewSessionStudents.length === 0 && (
                                            <tr><td colSpan="3" className="py-8 text-center text-slate-400">No students marked present yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-sm text-slate-500">Total Present: <strong className="text-slate-900">{viewSessionStudents.length}</strong></span>
                            <button onClick={() => setViewSession(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-medium transition">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassView;
