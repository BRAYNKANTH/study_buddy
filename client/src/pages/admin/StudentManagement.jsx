import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { SkeletonTable } from '../../components/SkeletonCard';
import EmptyState from '../../components/EmptyState';

const StudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [parents, setParents] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        StudentID: '',
        ParentID: '',
        StudentName: '',
        Grade: '',
        QRCode: ''
    });

    // Secure Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [verifyError, setVerifyError] = useState('');

    useEffect(() => {
        fetchStudents();
        fetchParents();
    }, []);

    // ... fetchStudents, fetchParents, handleChange, handleSubmit
    const fetchStudents = async () => {
        try {
            const res = await api.get('/users/students');
            setStudents(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchParents = async () => {
        try {
            const res = await api.get('/users/parents');
            setParents(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/students', formData);
            toast.success("Student added successfully!");
            setFormData({ StudentID: '', ParentID: '', StudentName: '', Grade: '', QRCode: '' });
            fetchStudents();
        } catch (err) {
            toast.error("Error adding student: " + (err.response?.data?.message || err.message));
        }
    };

    const initiateDelete = (studentId) => {
        setSelectedStudentId(studentId);
        setDeleteModalOpen(true);
        setAdminPassword('');
        setVerifyError('');
    };

    const handleSecureDelete = async () => {
        try {
            const verifyRes = await api.post('/auth/verify-password', { password: adminPassword });
            if (verifyRes.data.success) {
                await api.delete(`/users/student/${selectedStudentId}`);
                setDeleteModalOpen(false);
                fetchStudents();
                toast.success("Student deleted successfully.");
            } else {
                setVerifyError("Incorrect password");
            }
        } catch (err) {
            setVerifyError("Verification failed or Error deleting student");
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Manage Students</h2>

            {/* Add Student Form */}
            <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Student</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="StudentID" placeholder="Student ID (e.g. S005)" value={formData.StudentID} onChange={handleChange} required className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <input name="StudentName" placeholder="Full Name" value={formData.StudentName} onChange={handleChange} required className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />

                    <select name="ParentID" value={formData.ParentID} onChange={handleChange} required className="input-field border border-slate-300 p-2 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none">
                        <option value="">Select Parent</option>
                        {parents.map(p => (
                            <option key={p.ParentID} value={p.ParentID}>{p.FullName} ({p.Email})</option>
                        ))}
                    </select>

                    <input name="Grade" type="number" placeholder="Grade" value={formData.Grade} onChange={handleChange} required className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <input name="QRCode" placeholder="QR Code String (Unique)" value={formData.QRCode} onChange={handleChange} required className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />

                    <button type="submit" className="md:col-span-2 glass-button py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg mt-4 transform active:scale-95">Add Student</button>
                </form>
            </div>

            {/* Students List */}
            <div className="glass-card p-6 overflow-x-auto bg-white border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Students List</h3>
                {loading ? <SkeletonTable rows={5} cols={5} /> : (
                    <table className="w-full text-left text-slate-700">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <th className="p-3 font-semibold text-sm">ID</th>
                                <th className="p-3 font-semibold text-sm">Name</th>
                                <th className="p-3 font-semibold text-sm">Grade</th>
                                <th className="p-3 font-semibold text-sm">Parent</th>
                                <th className="p-3 font-semibold text-sm">QR Code</th>
                                <th className="p-3 font-semibold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState icon="🎓" title="No Students Found" subtitle="Students registered by parents will appear here." />
                                    </td>
                                </tr>
                            )}
                            {students.map(s => (
                                <tr key={s.StudentID} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                    <td className="p-3 text-sm text-slate-500 font-mono">{s.StudentID}</td>
                                    <td className="p-3 text-sm font-medium text-slate-900">{s.StudentName}</td>
                                    <td className="p-3 text-sm text-slate-600">{s.Grade}</td>
                                    <td className="p-3 text-sm text-slate-600">{s.ParentName}</td>
                                    <td className="p-3 text-sm text-slate-400 font-mono text-xs">{s.QRCode}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => initiateDelete(s.StudentID)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition text-xs font-medium"
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
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Student Deletion</h3>
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

export default StudentManagement;
