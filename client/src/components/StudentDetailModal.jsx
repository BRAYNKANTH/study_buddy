import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const StudentDetailModal = ({ student, subjectId, onClose, onNavigateToChat }) => {
    const [attendance, setAttendance] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    // Use student.StudentID for fetching details
    const studentId = student.StudentID;

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const [attRes, resRes] = await Promise.all([
                    api.get(`/attendance/${studentId}?subjectId=${subjectId}`),
                    api.get(`/academic/results/${studentId}`)
                ]);
                setAttendance(attRes.data);
                setResults(resRes.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchDetails();
    }, [studentId, subjectId]);

    // Calculate Attendance Percentage
    const totalSessions = 20; // Mock total or fetch from session count
    const presentCount = attendance.length;
    const percentage = Math.round((presentCount / totalSessions) * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl w-full shadow-2xl overflow-hidden relative animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">✕</button>

                {/* Header Section with Basic Info & Action */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-1">{student.StudentName}</h2>
                        <div className="flex items-center gap-4 text-slate-500 font-mono text-sm">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ID: {student.StudentID}</span>
                            <span>Grade {student.Grade}</span>
                        </div>
                    </div>

                    {/* Chat Option */}
                    <button
                        onClick={() => {
                            if (student.ParentID) {
                                onNavigateToChat({
                                    ContactID: student.ParentID,
                                    ContactName: student.ParentName || 'Parent',
                                    Role: 'parent',
                                    SubjectName: 'Parent'
                                });
                            } else {
                                alert("Parent account not linked for this student.");
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/20 transition group font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Chat with Parent
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Detailed Info Card */}
                    <div className="glass-card p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Student Info</h3>

                        <div>
                            <p className="text-xs text-slate-500">Year Enrolled</p>
                            <p className="text-slate-900 font-medium">
                                {student.EnrolledDate ? new Date(student.EnrolledDate).getFullYear() : 'N/A'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Enrolled Subjects</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {student.EnrolledSubjects ? student.EnrolledSubjects.split(', ').map(sub => (
                                    <span key={sub} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
                                        {sub}
                                    </span>
                                )) : <span className="text-slate-400 text-sm">None</span>}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Parent Phone</p>
                            <p className="text-slate-700 font-mono text-sm">{student.ParentPhone || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="col-span-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-card p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <h3 className="text-sm text-emerald-600 uppercase font-semibold">Attendance</h3>
                                <div className="text-3xl font-bold text-emerald-600 mt-1">{percentage}%</div>
                                <p className="text-xs text-emerald-600/70 mt-1">{presentCount} sessions present</p>
                            </div>
                            <div className="glass-card p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <h3 className="text-sm text-blue-600 uppercase font-semibold">Latest Result</h3>
                                <div className="text-3xl font-bold text-blue-600 mt-1">
                                    {results.length > 0 ? results[0].Marks : '-'}
                                </div>
                                <p className="text-xs text-blue-600/70 mt-1">{results.length > 0 ? results[0].ExamName : 'No exams'}</p>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="glass-card p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase">Recent Attendance</h3>
                            {loading ? <p className="text-slate-400 text-sm">Loading history...</p> : (
                                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="text-slate-400 text-xs border-b border-slate-100 sticky top-0 bg-white">
                                            <tr>
                                                <th className="pb-2">Date</th>
                                                <th className="pb-2">Status</th>
                                                <th className="pb-2">Subject</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendance.length > 0 ? attendance.slice(0, 10).map(att => (
                                                <tr key={att.AttendanceID} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                                    <td className="py-2">{new Date(att.Date).toLocaleDateString()}</td>
                                                    <td className="py-2 text-emerald-600 font-medium">Present</td>
                                                    <td className="py-2 text-xs text-slate-500">{att.SubjectName}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="py-4 text-center text-slate-400">No records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;
