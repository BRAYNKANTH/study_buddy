import { useState, useEffect } from 'react';
import api from '../../api/axios';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Form
    const [formData, setFormData] = useState({
        subjectName: '',
        fee: '',
        medium: 'Tamil',
        grades: []
    });

    // Secure Delete
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [verifyError, setVerifyError] = useState('');

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/academic/subjects');
            setSubjects(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching subjects:", err);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGradeChange = (e) => {
        const { value, checked } = e.target;
        const gradeVal = parseInt(value);
        setFormData(prev => {
            if (checked) {
                return { ...prev, grades: [...prev.grades, gradeVal] };
            } else {
                return { ...prev, grades: prev.grades.filter(g => g !== gradeVal) };
            }
        });
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/academic/subjects', formData);
            alert("Subject added successfully!");
            setFormData({ subjectName: '', fee: '', medium: 'Tamil', grades: [] });
            fetchSubjects();
        } catch (err) {
            alert("Error adding subject: " + (err.response?.data?.message || err.message));
        }
    };

    const initiateDelete = (subjectId) => {
        setSelectedSubjectId(subjectId);
        setDeleteModalOpen(true);
        setAdminPassword('');
        setVerifyError('');
    };

    const handleSecureDelete = async () => {
        try {
            const verifyRes = await api.post('/auth/verify-password', { password: adminPassword });
            if (verifyRes.data.success) {
                // 2. Delete
                await api.delete(`/academic/subjects/${selectedSubjectId}`);
                setDeleteModalOpen(false);
                fetchSubjects();
                alert("Subject deleted successfully.");
            } else {
                setVerifyError("Incorrect password");
            }
        } catch (err) {
            setVerifyError("Verification failed or Error deleting subject");
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Manage Subjects</h2>

            {/* Add Subject Form */}
            <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Subject</h3>
                <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Subject ID: Removed (Auto-generated) */}

                    <input name="subjectName" placeholder="Subject Name" value={formData.subjectName} onChange={handleChange} required autoComplete="off" className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <select name="medium" value={formData.medium} onChange={handleChange} className="input-field border border-slate-300 p-2 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none">
                        <option value="Tamil">Tamil</option>
                        <option value="English">English</option>
                    </select>
                    <div className="md:col-span-2">
                        <input name="fee" type="number" placeholder="Fee (Rs)" value={formData.fee} onChange={handleChange} required autoComplete="off" className="input-field border border-slate-300 p-2 rounded text-slate-900 w-full focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>

                    {/* Grade Multi-Select */}
                    <div className="md:col-span-2">
                        <label className="block text-slate-700 mb-2 text-sm font-medium">Applicable Grades</label>
                        <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {[6, 7, 8, 9].map((grade) => (
                                <label key={grade} className="flex items-center space-x-2 cursor-pointer select-none px-3 py-1 bg-white rounded-full hover:bg-slate-100 transition border border-slate-200">
                                    <input
                                        type="checkbox"
                                        value={grade}
                                        checked={formData.grades.includes(grade)}
                                        onChange={handleGradeChange}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Grade {grade}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="md:col-span-2 glass-button py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg">Add Subject</button>
                </form>
            </div>

            {/* Subject List */}
            <div className="glass-card p-6 overflow-x-auto bg-white border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Subject Library</h3>
                {loading ? <p className="text-slate-500">Loading...</p> : (
                    <table className="w-full text-left text-slate-700">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wide bg-slate-50">
                                <th className="p-3 font-semibold">ID</th>
                                <th className="p-3 font-semibold">Name</th>
                                <th className="p-3 font-semibold">Medium</th>
                                <th className="p-3 font-semibold">Grades</th>
                                <th className="p-3 font-semibold">Fee</th>
                                <th className="p-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.map(s => (
                                <tr key={s.SubjectID} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                    <td className="p-3 font-mono text-sm text-slate-500">{s.SubjectID}</td>
                                    <td className="p-3 font-medium text-slate-900">{s.SubjectName}</td>
                                    <td className="p-3 text-slate-600">{s.Medium}</td>
                                    <td className="p-3 text-slate-600">{s.Grades ? s.Grades : <span className="text-slate-400 italic">All</span>}</td>
                                    <td className="p-3 font-mono text-slate-900">Rs. {s.Fee}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => initiateDelete(s.SubjectID)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-xs font-medium shadow-sm"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Secure Delete Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
                        <p className="text-slate-500 mb-6">This action cannot be undone. Please enter your admin password to confirm.</p>

                        <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 mb-2 focus:ring-2 focus:ring-red-500 outline-none transition"
                            placeholder="Admin Password"
                            autoFocus
                        />
                        {verifyError && <p className="text-red-500 text-sm mb-4">{verifyError}</p>}

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSecureDelete}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition shadow-md shadow-red-500/20"
                            >
                                Verify & Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManagement;
