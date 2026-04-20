import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { SkeletonTable } from '../../components/SkeletonCard';
import EmptyState from '../../components/EmptyState';

const TutorManagement = () => {
    const [tutors, setTutors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        TeacherName: '',
        Email: '',
        Phone: '',
        Grades: [],
        SubjectIDs: [],
        Password: ''
    });

    // Secure Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTutorId, setSelectedTutorId] = useState(null);
    const [confirmText, setConfirmText] = useState('');
    const [verifyError, setVerifyError] = useState('');

    useEffect(() => {
        fetchTutors();
        fetchSubjects();
    }, []);

    const fetchTutors = async () => {
        try {
            const res = await api.get('/users/tutors');
            setTutors(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching tutors:", err);
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/academic/subjects');
            setSubjects(res.data);
        } catch (err) {
            console.error("Error fetching subjects:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCheckboxChange = (e, type) => {
        const { value, checked } = e.target;
        const numValue = type === 'Grades' ? parseInt(value) : value; // Grades are numbers, Subjects are strings

        setFormData(prev => {
            if (checked) {
                return { ...prev, [type]: [...prev[type], numValue] };
            } else {
                return { ...prev, [type]: prev[type].filter(item => item !== numValue) };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users/tutors', formData);
            toast.success("Tutor added successfully!");
            setFormData({ TeacherName: '', Email: '', Phone: '', Grades: [], SubjectIDs: [], Password: '' });
            fetchTutors();
        } catch (err) {
            toast.error("Error adding tutor: " + (err.response?.data?.message || err.message));
        }
    };

    const initiateDelete = (tutorId) => {
        setSelectedTutorId(tutorId);
        setDeleteModalOpen(true);
        setConfirmText('');
        setVerifyError('');
    };

    const handleSecureDelete = async () => {
        if (confirmText !== 'DELETE') {
            setVerifyError('Type DELETE (all caps) to confirm.');
            return;
        }
        try {
            await api.delete(`/users/${selectedTutorId}`);
            setDeleteModalOpen(false);
            fetchTutors();
            toast.success("Tutor deleted successfully.");
        } catch (err) {
            setVerifyError("Error deleting tutor. Please try again.");
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Manage Tutors</h2>

            {/* Add Tutor Form */}
            <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Tutor</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Teacher ID: Removed (Auto-generated) */}

                    <input name="TeacherName" placeholder="Full Name" value={formData.TeacherName} onChange={handleChange} required autoComplete="off" className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <input name="Email" type="email" placeholder="Email" value={formData.Email} onChange={handleChange} required autoComplete="off" className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <input name="Phone" placeholder="Phone" value={formData.Phone} onChange={handleChange} required autoComplete="off" className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <input name="Password" type="password" placeholder="Password" value={formData.Password} onChange={handleChange} required autoComplete="new-password" className="input-field border border-slate-300 p-2 rounded text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none" />

                    {/* Grades Multi-Select */}
                    <div className="md:col-span-2">
                        <label className="block text-slate-700 mb-2 text-md font-medium">Grades Taught</label>
                        <div className="flex flex-wrap gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                            {[6, 7, 8, 9].map((grade) => (
                                <label key={grade} className={`flex items-center space-x-2 cursor-pointer px-4 py-2 rounded-lg transition-all duration-300 border ${formData.Grades.includes(grade) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                    <input
                                        type="checkbox"
                                        value={grade}
                                        checked={formData.Grades.includes(grade)}
                                        onChange={(e) => handleCheckboxChange(e, 'Grades')}
                                        className="hidden" // Hiding default checkbox for custom style
                                    />
                                    <span className="font-bold">{formData.Grades.includes(grade) ? '✓ ' : ''}Grade {grade}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Subjects Multi-Select */}
                    <div className="md:col-span-2">
                        <label className="block text-slate-700 mb-2 text-md font-medium">Subjects Taught</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner max-h-60 overflow-y-auto custom-scrollbar">
                            {subjects.map((subject) => (
                                <label key={subject.SubjectID} className={`flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 border ${formData.SubjectIDs.includes(subject.SubjectID) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                    <input
                                        type="checkbox"
                                        value={subject.SubjectID}
                                        checked={formData.SubjectIDs.includes(subject.SubjectID)}
                                        onChange={(e) => handleCheckboxChange(e, 'SubjectIDs')}
                                        className="hidden"
                                    />
                                    <span className="text-sm font-medium truncate w-full" title={subject.SubjectName}>
                                        {formData.SubjectIDs.includes(subject.SubjectID) ? '✓ ' : ''}{subject.SubjectName}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="md:col-span-2 glass-button py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg mt-4 transform active:scale-95">Add Tutor</button>
                </form>
            </div>

            {/* Tutors List */}
            <div className="glass-card p-6 overflow-x-auto bg-white border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Tutors List</h3>
                {loading ? <SkeletonTable rows={4} cols={5} /> : (
                    <table className="w-full text-left text-slate-700">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <th className="p-3 font-semibold text-sm">ID</th>
                                <th className="p-3 font-semibold text-sm">Name</th>
                                <th className="p-3 font-semibold text-sm">Email</th>
                                <th className="p-3 font-semibold text-sm">Phone</th>
                                <th className="p-3 font-semibold text-sm">Grades</th>
                                <th className="p-3 font-semibold text-sm">Subjects</th>
                                <th className="p-3 font-semibold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tutors.length === 0 && (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState icon="👨‍🏫" title="No Tutors Added" subtitle="Add your first tutor using the form above." />
                                    </td>
                                </tr>
                            )}
                            {tutors.map(t => (
                                <tr key={t.TeacherID} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                    <td className="p-3 text-sm text-slate-500 font-mono">{t.TeacherID}</td>
                                    <td className="p-3 text-sm font-medium text-slate-900">{t.TeacherName}</td>
                                    <td className="p-3 text-sm text-slate-600">{t.Email}</td>
                                    <td className="p-3 text-sm text-slate-600">{t.Phone}</td>
                                    <td className="p-3 text-sm text-slate-600">{t.Grades.join(', ')}</td>
                                    <td className="p-3 text-sm text-slate-600">{t.Subjects}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => initiateDelete(t.TeacherID)}
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
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Tutor Deletion</h3>
                        <p className="text-slate-500 mb-4">This action cannot be undone. Type <strong className="text-red-600">DELETE</strong> to confirm.</p>

                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 mb-2 focus:ring-2 focus:ring-red-500 outline-none transition font-mono tracking-widest"
                            placeholder="DELETE"
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

export default TutorManagement;
