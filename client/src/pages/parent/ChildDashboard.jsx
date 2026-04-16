import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Chat from '../communication/Chat';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const ChildDashboard = ({ student, onBack }) => {
    const [tab, setTab] = useState('subjects'); // subjects, attendance, results, timetable
    const [subjects, setSubjects] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [results, setResults] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null); // For material view
    const [manageMode, setManageMode] = useState(false);
    const [subjectView, setSubjectView] = useState('materials'); // 'materials', 'chat'

    useEffect(() => {
        fetchSubjects();
    }, [student.StudentID]);

    const fetchSubjects = async () => {
        try {
            const res = await api.get(`/academic/enrollments/${student.StudentID}`);
            setSubjects(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchMaterials = async (subjectId) => {
        try {
            const res = await api.get(`/academic/materials/${subjectId}`);
            setMaterials(res.data);
            setSelectedSubject(subjectId);
            setSubjectView('materials');
        } catch (err) { console.error(err); }
    };

    const fetchAttendance = async () => {
        try {
            const res = await api.get(`/attendance/${student.StudentID}`);
            setAttendance(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchResults = async () => {
        try {
            const res = await api.get(`/academic/results/${student.StudentID}`);
            setResults(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTimetable = async () => {
        try {
            const res = await api.get(`/academic/timetable/${student.StudentID}`);
            setTimetable(res.data);
        } catch (err) { console.error(err); }
    };

    // Load data on tab switch
    useEffect(() => {
        if (tab === 'attendance') fetchAttendance();
        if (tab === 'results') fetchResults();
        if (tab === 'timetable') fetchTimetable();
    }, [tab]);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col animate-fade-in-up">
            {/* Header */}
            <div className="bg-blue-600 p-4 md:p-6 rounded-t-2xl border-b border-blue-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition text-white border border-white/20">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{student.StudentName}</h1>
                        <p className="text-blue-100 text-sm">Grade {student.Grade}</p>
                    </div>
                </div>
                <div className="flex space-x-1 bg-white/10 p-1.5 rounded-2xl border border-white/10 overflow-x-auto relative z-10 backdrop-blur-sm">
                    {['subjects', 'timetable', 'attendance', 'results'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setSelectedSubject(null); }}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all duration-300 whitespace-nowrap ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-50 hover:text-white hover:bg-white/10'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 bg-blue-50/50 rounded-b-2xl">
                {/* SUBJECTS & MATERIALS */}
                {tab === 'subjects' && (
                    <div className="flex gap-8 h-full">
                        {/* Subject List or Grid */}
                        <div className={`transition-all duration-300 h-full overflow-y-auto custom-scrollbar ${selectedSubject ? 'w-1/3 border-r border-slate-200 pr-6 hidden md:block' : 'w-full'}`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">Enrolled Subjects</h3>
                                <button
                                    onClick={() => setManageMode(true)}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                                >
                                    Manage Subjects
                                </button>
                            </div>

                            {subjects.length === 0 ? (
                                <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center bg-white">
                                    <p className="text-slate-400 italic">No subjects enrolled yet.</p>
                                    <button onClick={() => setManageMode(true)} className="mt-4 text-blue-500 hover:text-blue-400 underline">Enroll now</button>
                                </div>
                            ) : (
                                <div className={selectedSubject ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                                    {subjects.map(sub => (
                                        <div
                                            key={sub.SubjectID}
                                            onClick={() => fetchMaterials(sub.SubjectID)}
                                            className={`
                                                cursor-pointer transition border relative overflow-hidden
                                                ${selectedSubject
                                                    ? `p-4 rounded-xl flex justify-between items-center ${selectedSubject === sub.SubjectID ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`
                                                    : 'p-8 rounded-2xl bg-gradient-to-br from-white to-blue-50 border-blue-100 hover:shadow-xl hover:-translate-y-1 group flex flex-col items-center justify-center text-center gap-4'
                                                }
                                            `}
                                        >
                                            {!selectedSubject && (
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            )}

                                            {!selectedSubject && (
                                                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl mb-2 group-hover:scale-110 transition-transform">
                                                    📚
                                                </div>
                                            )}

                                            <div className={selectedSubject ? "flex justify-between items-center w-full" : ""}>
                                                <h4 className={`font-bold ${selectedSubject ? 'text-sm' : 'text-xl text-slate-900'}`}>{sub.SubjectName}</h4>
                                                {selectedSubject && selectedSubject === sub.SubjectID && <span className="text-lg text-blue-600">●</span>}
                                            </div>

                                            {!selectedSubject && (
                                                <div className="mt-4 w-full flex gap-2">
                                                    <span className="text-blue-600 text-sm font-bold flex-1 text-left group-hover:text-blue-700">View Materials →</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* MANAGE SUBJECTS MODAL */}
                        {manageMode && (
                            <ManageSubjectsModal
                                student={student}
                                enrolledSubjects={subjects}
                                onClose={() => { setManageMode(false); fetchSubjects(); fetchTimetable(); }}
                            />
                        )}

                        {/* Materials Detail */}
                        {selectedSubject && (
                            <div className="flex-1 pl-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <button className="md:hidden mr-2 text-slate-500" onClick={() => setSelectedSubject(null)}>←</button>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            {subjects.find(s => s.SubjectID === selectedSubject)?.SubjectName}
                                        </h3>
                                    </div>

                                    {/* Subject Tabs */}
                                    <div className="flex bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                                        <button
                                            onClick={() => setSubjectView('materials')}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${subjectView === 'materials' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            Materials
                                        </button>
                                        {subjects.find(s => s.SubjectID === selectedSubject)?.TeacherID && (
                                            <button
                                                onClick={() => setSubjectView('chat')}
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${subjectView === 'chat' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-600 hover:text-emerald-700'}`}
                                            >
                                                <span>💬</span> Chat
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {subjectView === 'materials' ? (
                                    materials.length === 0 ? (
                                        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                                            <p className="text-slate-400">No materials uploaded for this subject yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {materials.map(mat => (
                                                <div key={mat.MaterialID} className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="p-2 bg-red-50 text-red-500 rounded-lg text-xl border border-red-100">
                                                            {mat.FileType === 'PDF' ? '📄' : '📁'}
                                                        </div>
                                                        <span className="text-xs text-slate-400">{new Date(mat.UploadDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition truncate" title={mat.Title}>{mat.Title}</h4>
                                                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{mat.Description}</p>

                                                    <div className="flex gap-2">
                                                        <a
                                                            href={`${API_BASE}/uploads/materials/${mat.FileName}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-blue-100"
                                                        >
                                                            <span>👁</span> Open
                                                        </a>
                                                        <a
                                                            href={`/api/academic/materials/download/${mat.FileName}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-emerald-100"
                                                        >
                                                            <span>⬇</span> Save
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <Chat
                                        isEmbedded={true}
                                        forcedContact={{
                                            ContactID: subjects.find(s => s.SubjectID === selectedSubject)?.TeacherID,
                                            ContactName: subjects.find(s => s.SubjectID === selectedSubject)?.TeacherName,
                                            SubjectName: subjects.find(s => s.SubjectID === selectedSubject)?.SubjectName,
                                            Role: 'Teacher'
                                        }}
                                    />
                                )}
                            </div>
                        )}
                        {!selectedSubject && subjects.length > 0 && (
                            <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                <p>Select a subject to view learning materials.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TIMETABLE */}
                {tab === 'timetable' && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">Weekly Class Schedule</h3>
                        {timetable.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">No classes scheduled yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {timetable.map(entry => (
                                    <div key={entry.TimetableID} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition border-l-4 border-l-blue-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                                                {entry.DayOfWeek}
                                            </span>
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Grade {entry.Grade}</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">{entry.SubjectName}</h4>
                                        <p className="text-sm text-slate-500 mt-1">👨‍🏫 {entry.TeacherName}</p>
                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span>🕒</span>
                                            <span>{entry.StartTime?.slice(0, 5)} – {entry.EndTime?.slice(0, 5)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ATTENDANCE */}
                {tab === 'attendance' && (
                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                        {attendance.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No attendance records found.</div>
                        ) : (
                            <table className="w-full text-left text-slate-900 min-w-[480px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Date</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Subject</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Status</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendance.map(atk => (
                                        <tr key={atk.AttendanceID} className="hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-600">{new Date(atk.Date).toLocaleDateString()}</td>
                                            <td className="p-4 text-slate-600 font-medium">{atk.SubjectName}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${atk.Status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                                    {atk.Status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500 text-sm">
                                                {atk.StartTime?.slice(0, 5)} - {atk.EndTime?.slice(0, 5)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* RESULTS */}
                {tab === 'results' && (
                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                        {results.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No exam results found.</div>
                        ) : (
                            <table className="w-full text-left text-slate-900 min-w-[500px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Exam</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Subject</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Marks</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Grade</th>
                                        <th className="p-4 text-sm font-semibold text-slate-500">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map(res => (
                                        <tr key={res.MarkID} className="hover:bg-slate-50 transition">
                                            <td className="p-4 text-slate-600 font-medium">{res.ExamName}</td>
                                            <td className="p-4 text-slate-500">{res.SubjectName}</td>
                                            <td className="p-4 font-bold text-lg">{res.Marks}</td>
                                            <td className="p-4">
                                                <span className={`inline-block w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border ${res.Grade === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : res.Grade === 'B' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {res.Grade}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 italic text-sm">{res.Remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChildDashboard;

const ManageSubjectsModal = ({ student, enrolledSubjects, onClose }) => {
    const [allSubjects, setAllSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await api.get('/academic/subjects');
                setAllSubjects(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const isEnrolled = (subId) => enrolledSubjects.some(e => e.SubjectID === subId);

    const handleToggle = async (subject) => {
        const action = isEnrolled(subject.SubjectID) ? 'unenroll' : 'enroll';

        if (action === 'unenroll') {
            toast((t) => (
                <span className="flex items-center gap-3">
                    <span className="text-sm">Drop <b>{subject.SubjectName}</b>?</span>
                    <button
                        onClick={() => { toast.dismiss(t.id); doToggle(subject, action); }}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold"
                    >Drop</button>
                    <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">Cancel</button>
                </span>
            ), { duration: 6000 });
            return;
        }

        doToggle(subject, action);
    };

    const doToggle = async (subject, action) => {
        setProcessing(subject.SubjectID);
        try {
            await api.post(`/academic/${action}`, {
                studentId: student.StudentID,
                subjectId: subject.SubjectID
            });
            toast.success(`${action === 'enroll' ? 'Enrolled in' : 'Dropped'} ${subject.SubjectName}`);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error updating enrollment");
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Manage Subjects</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {loading ? <p className="text-slate-500">Loading...</p> : allSubjects.map(sub => {
                        const enrolled = isEnrolled(sub.SubjectID);
                        return (
                            <div key={sub.SubjectID} className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-100">
                                <div>
                                    <h4 className="text-slate-800 font-semibold">{sub.SubjectName}</h4>
                                    <span className={`text-xs ${enrolled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {enrolled ? 'Currently Enrolled' : 'Not Enrolled'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleToggle(sub)}
                                    disabled={processing === sub.SubjectID}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${enrolled
                                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                                        }`}
                                >
                                    {processing === sub.SubjectID ? '...' : enrolled ? 'Drop' : 'Add'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
