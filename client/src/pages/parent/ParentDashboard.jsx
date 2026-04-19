import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import QRGenerator from '../../components/QRGenerator';
import StudentIDCard from '../../components/StudentIDCard';
import AnnouncementBoard from '../../components/AnnouncementBoard';
import PageHeader from '../../components/PageHeader';
import SkeletonCard from '../../components/SkeletonCard';
import EmptyState from '../../components/EmptyState';
import BottomNav from '../../components/BottomNav';
import ChildDashboard from './ChildDashboard';
import Chat from '../communication/Chat';

const ParentDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [children, setChildren] = useState([]);
    const [payments, setPayments] = useState([]);
    const [results, setResults] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [viewIdCard, setViewIdCard] = useState(null); // Child object for ID card modal
    const [viewChildDashboard, setViewChildDashboard] = useState(null); // Child object for full dashboard
    const [loading, setLoading] = useState(true);

    // Payment Form State
    const [payMonth, setPayMonth] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [payRef, setPayRef] = useState('');
    const [payStudent, setPayStudent] = useState('');
    const [payFile, setPayFile] = useState(null);
    const [showPayModal, setShowPayModal] = useState(false);

    // PayHere State
    const [paymentMode, setPaymentMode] = useState('card'); // 'card', 'slip'
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const receiptRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [childRes, payRes] = await Promise.all([
                    api.get('/users/my-children'),
                    api.get('/payments/history')
                ]);
                setChildren(childRes.data);
                setPayments(payRes.data);
                if (childRes.data.length > 0) {
                    setPayStudent(childRes.data[0].StudentID);
                    setSelectedChild(childRes.data[0].StudentID);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUnenrollStudent = (child) => {
        toast((t) => (
            <div className="flex flex-col gap-3">
                <p className="font-semibold text-slate-800">Unenroll {child.StudentName}?</p>
                <p className="text-sm text-slate-500">This will permanently remove the student from your account.</p>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await api.delete(`/users/student/${child.StudentID}`);
                                setChildren(prev => prev.filter(c => c.StudentID !== child.StudentID));
                                toast.success(`${child.StudentName} has been unenrolled.`);
                            } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to unenroll student.');
                            }
                        }}
                        className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                        Unenroll
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: 10000 });
    };

    const handlePayHerePayment = async (paymentId, amount) => {
        try {
            // 1. Get Hash from Backend
            const currency = 'LKR';
            const hashRes = await api.post('/payments/hash', {
                order_id: paymentId,
                amount: amount,
                currency: currency
            });

            const { hash, merchantId, amountFormatted } = hashRes.data;

            // 2. Define PayHere Params
            const payment = {
                "sandbox": true,
                "merchant_id": merchantId,
                "return_url": window.location.origin + "/parent/dashboard",
                "cancel_url": window.location.origin + "/parent/dashboard",
                "notify_url": `${import.meta.env.VITE_API_URL}/payments/notify`,
                "order_id": paymentId,
                "items": `Monthly Fee - ${payMonth}`,
                "amount": amountFormatted,
                "currency": currency,
                "hash": hash,
                "first_name": user.name || "Parent",
                "last_name": "User",
                "email": user.email || "parent@example.com",
                "phone": "0771234567",
                "address": "Colombo",
                "city": "Colombo",
                "country": "Sri Lanka"
            };

            // 3. Define Handlers BEFORE starting
            window.payhere.onCompleted = async function onCompleted(orderId) {
                console.log("Payment completed. OrderID:" + orderId);

                // Optimistically show success because gateway confirmed it
                setSuccessData({ paymentId: orderId, amount, month: payMonth, studentId: payStudent });
                setPaymentSuccess(true);

                try {
                    await api.put(`/payments/payhere-complete`, { paymentId: orderId });
                    const res = await api.get('/payments/history');
                    setPayments(res.data);
                } catch (e) {
                    console.error("Verification API failed", e);
                    toast.success("Payment received! It will reflect shortly.");
                }
            };

            window.payhere.onDismissed = function onDismissed() {
                toast("Payment was cancelled.", { icon: 'ℹ️' });
            };

            window.payhere.onError = function onError(error) {
                toast.error("Payment Error: " + error);
            };

            // 4. Start Payment
            window.payhere.startPayment(payment);

        } catch (err) {
            console.error(err);
            toast.error("Failed to initiate payment. Please try again.");
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('studentId', payStudent);
        formData.append('month', payMonth);
        formData.append('amount', payAmount);

        if (paymentMode === 'slip') {
            formData.append('referenceNo', payRef);
            if (payFile) {
                formData.append('receipt', payFile);
            }
        } else {
            formData.append('referenceNo', 'PAYHERE_INIT'); // Placeholder
        }

        try {
            const res = await api.post('/payments/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (paymentMode === 'card') {
                if (res.data.paymentId) {
                    await handlePayHerePayment(res.data.paymentId, payAmount);
                } else {
                    toast.error("System Error: Could not generate Payment ID.");
                }
            } else {
                toast.success("Payment submitted! Awaiting admin verification.");
                const resHist = await api.get('/payments/history');
                setPayments(resHist.data);
                setPayRef('');
                setPayAmount('');
                setPayFile(null);
            }
        } catch (err) {
            toast.error("Error submitting payment: " + (err.response?.data?.message || err.message));
        }
    };

    const downloadReceipt = async () => {
        if (!receiptRef.current) return;
        try {
            const canvas = await html2canvas(receiptRef.current);
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `Receipt_${successData?.paymentId}.png`;
            link.click();
        } catch (err) {
            console.error("Receipt download failed", err);
            toast.error("Could not download receipt. Please take a screenshot.");
        }
    };

    const [chatTarget, setChatTarget] = useState(null);
    const [chatFilterStudent, setChatFilterStudent] = useState(null);

    // ... (rest of code) ...

    const handleChatRequest = (contactId, studentId) => {
        setChatTarget(contactId);
        setChatFilterStudent(studentId);
        setActiveTab('chat');
        setViewChildDashboard(null);
    };



    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/communication/unread-count');
            setUnreadCount(res.data.count);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8 transition-colors duration-300 bg-slate-50">
            {viewIdCard && (
                <StudentIDCard student={viewIdCard} onClose={() => setViewIdCard(null)} />
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                {viewChildDashboard ? (
                    <ChildDashboard
                        student={viewChildDashboard}
                        onBack={() => setViewChildDashboard(null)}
                        onChat={handleChatRequest}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <PageHeader
                            title="Parent Portal"
                            subtitle={`Welcome back, ${user?.name}`}
                            onLogout={logout}
                        />

                        {/* Navigation */}
                        {/* Navigation Menu — tab bar hidden on mobile, replaced by BottomNav */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="hidden md:flex space-x-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto overflow-x-auto">
                                <button onClick={() => setActiveTab('overview')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                                    Overview
                                </button>
                                <button onClick={() => setActiveTab('payments')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'payments' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                                    Fees & Payments
                                </button>
                                <button onClick={() => setActiveTab('academic')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'academic' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                                    Academic Progress
                                </button>
                                <button onClick={() => setActiveTab('chat')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                                    Messages
                                    {unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <button onClick={() => window.location.href = '/parent/add-student'} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white border border-blue-800/10 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 min-w-max">
                                <span className="text-lg leading-none">+</span> Add New Student
                            </button>
                        </div>

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <>
                                <h2 className="text-xl font-bold text-slate-900 mb-4">My Children</h2>
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <SkeletonCard count={3} height="h-56" />
                                    </div>
                                ) : children.length === 0 ? (
                                    <EmptyState
                                        icon="🎓"
                                        title="No Students Enrolled"
                                        subtitle="Register your child to start tracking attendance, results, and fee payments."
                                        action={() => window.location.href = '/parent/add-student'}
                                        actionLabel="+ Add Student"
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {children.map(child => (
                                            <div key={child.StudentID} className="glass-card p-6 flex flex-col items-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group hover:border-blue-300 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                                                    🎓
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 mb-1">{child.StudentName}</h3>
                                                <p className="text-slate-500 text-sm mb-6">Grade {child.Grade}</p>

                                                {child.IsApproved ? (
                                                    <div className="flex flex-col w-full gap-3 mt-auto">
                                                        <button
                                                            onClick={() => setViewChildDashboard(child)}
                                                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-lg hover:shadow-blue-500/20"
                                                        >
                                                            View Dashboard
                                                        </button>
                                                        <button
                                                            onClick={() => setViewIdCard(child)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                                                        >
                                                            <span>🆔</span> View ID Card
                                                        </button>
                                                        <button
                                                            onClick={() => handleUnenrollStudent(child)}
                                                            className="w-full px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                                                        >
                                                            <span>🗑️</span> Unenroll
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col w-full gap-3 mt-auto">
                                                        {/* Check for Pending Registration Payment */
                                                            (() => {
                                                                const pendingPay = payments.find(p => p.StudentID === child.StudentID && p.Status === 'Pending' && p.ReferenceNo === 'PENDING_UPLOAD');
                                                                if (pendingPay) {
                                                                    return (
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveTab('payments');
                                                                                setPayStudent(child.StudentID);
                                                                                // Optional: Pre-fill amount if we had it, but history might not return amount in list if basic query
                                                                                // Assuming user knows or check history
                                                                                setPayAmount(pendingPay.Amount); // If backend returns it
                                                                                toast(`Please complete the payment of Rs. ${pendingPay.Amount} for registration.`, { icon: '⚠️' });
                                                                            }}
                                                                            className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-amber-900/20 animate-pulse"
                                                                        >
                                                                            ⚠ Complete Payment
                                                                        </button>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <div className="flex flex-col items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-xl w-full text-center">
                                                                            <span className="text-yellow-600 text-xs font-bold uppercase tracking-wide">Pending Approval</span>
                                                                            <p className="text-[10px] text-yellow-600/70 mt-1">
                                                                                ID Card will be available <br /> after verification.
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                }
                                                            })()
                                                        }
                                                        <button
                                                            onClick={() => handleUnenrollStudent(child)}
                                                            className="w-full px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                                                        >
                                                            <span>🗑️</span> Unenroll
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-8">
                                    <AnnouncementBoard />
                                </div>
                            </>
                        )}

                        {/* Payments Tab */}
                        {activeTab === 'payments' && (
                            <>
                                {paymentSuccess ? (
                                    <div className="glass-card p-8 animate-fade-in-up text-center max-w-lg mx-auto mt-10 bg-white border border-slate-200 rounded-xl shadow-lg">
                                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/30 mb-6">
                                            ✓
                                        </div>
                                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
                                        <p className="text-slate-500 mb-8">Thank you. Your payment has been verified.</p>

                                        <div className="flex justify-center mb-8">
                                            <div ref={receiptRef} className="bg-white text-slate-900 p-6 rounded-lg shadow-xl max-w-sm w-full text-left font-mono relative overflow-hidden border border-slate-200">
                                                <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4 text-center">
                                                    <h3 className="text-xl font-bold uppercase tracking-wider">Theebam Education</h3>
                                                    <p className="text-xs text-slate-500">Official Receipt</p>
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-bold">{new Date().toLocaleDateString()}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Payment ID:</span><span className="font-bold">{successData?.paymentId}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Student:</span><span className="font-bold">{children.find(c => c.StudentID === successData?.studentId)?.StudentName || successData?.studentId}</span></div>
                                                    <div className="flex justify-between"><span className="text-slate-500">Month:</span><span className="font-bold">{successData?.month}</span></div>
                                                </div>
                                                <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
                                                <div className="flex justify-between items-center text-lg"><span className="font-bold">TOTAL</span><span className="font-bold text-emerald-600">LKR {successData?.amount}</span></div>
                                                <div className="mt-6 text-center text-[10px] text-slate-400"><p>Electronic Receipt</p></div>
                                                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button onClick={downloadReceipt} className="w-full py-3 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-50 transition shadow-sm flex items-center justify-center gap-2">
                                                <span>📥</span> Download Receipt
                                            </button>
                                            <button onClick={() => { setPaymentSuccess(false); setSuccessData(null); }} className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl font-medium hover:bg-slate-100 border border-slate-200 transition">
                                                Back to Payments
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="glass-card p-4 md:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-slate-900">Payment History</h3>
                                            <button onClick={() => setShowPayModal(true)}
                                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-blue-500/20 transition flex items-center gap-2">
                                                <span className="text-lg leading-none">+</span> Make Payment
                                            </button>
                                        </div>
                                        <div className="overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                                            {payments.length === 0 ? (
                                                <EmptyState icon="💳" title="No Payment History" subtitle="Your payment records will appear here once you make your first payment." />
                                            ) : (
                                                <table className="w-full text-left text-sm text-slate-600">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                                            <th className="pb-3 pl-4 pt-3">Date</th>
                                                            <th className="pb-3 pt-3">Month</th>
                                                            <th className="pb-3 pt-3">Status</th>
                                                            <th className="pb-3 text-right pr-4 pt-3">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-slate-700">
                                                        {payments.map(p => (
                                                            <tr key={p.PaymentID} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                                <td className="py-4 pl-4 text-slate-500">{new Date(p.PaymentDate).toLocaleDateString()}</td>
                                                                <td className="py-4">{p.Month}</td>
                                                                <td className="py-4">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${p.Status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : p.Status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                                        {p.Status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-right pr-4 font-mono font-medium text-slate-900">Rs. {p.Amount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Payment Modal */}
                                {showPayModal && (
                                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
                                        <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-scale-in">
                                            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                                                <h3 className="text-lg font-bold text-slate-900">Make a Payment</h3>
                                                <button onClick={() => setShowPayModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                            <div className="p-6 overflow-y-auto max-h-[80vh]">
                                                <div className="flex bg-slate-100 rounded-lg p-1 mb-5 border border-slate-200">
                                                    <button className={`flex-1 py-2 rounded-md transition text-sm font-medium ${paymentMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => setPaymentMode('card')}>Pay Online (Card)</button>
                                                    <button className={`flex-1 py-2 rounded-md transition text-sm font-medium ${paymentMode === 'slip' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => setPaymentMode('slip')}>Upload Slip</button>
                                                </div>
                                                <form onSubmit={(e) => { handlePaymentSubmit(e); setShowPayModal(false); }} className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm text-slate-500 mb-2 font-medium">Student</label>
                                                        <select value={payStudent} onChange={(e) => setPayStudent(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                                                            {children.map(c => <option key={c.StudentID} value={c.StudentID}>{c.StudentName}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-slate-500 mb-2 font-medium">Month</label>
                                                        <input type="month" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-slate-500 mb-2 font-medium">Amount (LKR)</label>
                                                        <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    </div>
                                                    {paymentMode === 'slip' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm text-slate-500 mb-2 font-medium">Reference No</label>
                                                                <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Bank Ref No (Optional)" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm text-slate-500 mb-2 font-medium">Upload Receipt</label>
                                                                <input type="file" onChange={(e) => setPayFile(e.target.files[0])} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" accept="image/*,application/pdf" />
                                                            </div>
                                                        </>
                                                    )}
                                                    <button type="submit" className="w-full py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-blue-500/20 font-bold transition-all">
                                                        {paymentMode === 'card' ? `Pay LKR ${payAmount || '0.00'} Now` : 'Submit Receipt'}
                                                    </button>
                                                    {paymentMode === 'card' && <p className="text-xs text-center text-slate-400">Secured by PayHere</p>}
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Academic Tab */}
                        {activeTab === 'academic' && (
                            <div className="glass-card p-8 bg-white border border-slate-200 rounded-2xl shadow-sm h-full min-h-[500px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Exam Results</h2>
                                    <select
                                        value={selectedChild}
                                        onChange={(e) => {
                                            setSelectedChild(e.target.value);
                                        }}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        {children.map(c => <option key={c.StudentID} value={c.StudentID}>{c.StudentName}</option>)}
                                    </select>
                                </div>

                                <ResultsTable studentId={selectedChild} />
                            </div>
                        )}

                        {/* Chat Tab */}
                        {activeTab === 'chat' && (
                            <div className="h-[600px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <Chat
                                    initialContactId={chatTarget}
                                // We might want to clear chatTarget when switching contacts inside Chat
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Mobile Bottom Navigation — only show when not in child dashboard */}
            {!viewChildDashboard && (
                <BottomNav
                    items={[
                        { id: 'overview', label: 'Home', icon: '🏠', badge: 0 },
                        { id: 'payments', label: 'Payments', icon: '💰', badge: 0 },
                        { id: 'academic', label: 'Progress', icon: '📊', badge: 0 },
                        { id: 'chat', label: 'Messages', icon: '💬', badge: unreadCount },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            )}
        </div>
    );
};

const ResultsTable = ({ studentId }) => {
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (!studentId) return;
        const fetchResults = async () => {
            try {
                const res = await api.get(`/academic/results/${studentId}`);
                setResults(res.data);
            } catch (err) { console.error(err); }
        };
        fetchResults();
    }, [studentId]);

    if (results.length === 0) return (
        <EmptyState
            icon="📋"
            title="No Results Yet"
            subtitle="Exam results will appear here once they are published by your teacher."
        />
    );

    return (
        <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                    <th className="p-4">Exam</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Marks</th>
                    <th className="p-4">Grade</th>
                    <th className="p-4">Remarks</th>
                </tr>
            </thead>
            <tbody className="text-slate-900">
                {results.map(r => (
                    <tr key={r.MarkID} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium">{r.ExamName}</td>
                        <td className="p-4 text-slate-500">{r.SubjectName}</td>
                        <td className="p-4 font-bold text-lg">{r.Marks}</td>
                        <td className="p-4"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs border border-blue-200 font-bold">{r.Grade}</span></td>
                        <td className="p-4 text-slate-500 italic">{r.Remarks}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ParentDashboard;
