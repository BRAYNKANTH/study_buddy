import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const AddStudent = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [subjects, setSubjects] = useState([]);
    const [formData, setFormData] = useState({
        StudentName: '',
        Grade: '',
        SubjectIDs: [] // Array of selected Subject IDs
    });

    // Payment Data
    const [paymentDetails, setPaymentDetails] = useState(null); // { studentId, paymentId, totalAmount }
    const [refNo, setRefNo] = useState('');
    const [paymentMode, setPaymentMode] = useState('card'); // 'card' or 'slip'
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const receiptRef = useRef(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get('/academic/subjects');
                setSubjects(res.data);
            } catch (err) {
                console.error("Error fetching subjects", err);
            }
        };
        fetchSubjects();
    }, []);

    // Handlers
    const handlePayHerePayment = async () => {
        try {
            // 1. Get Hash from Backend
            const orderId = paymentDetails.paymentId;
            const amount = paymentDetails.totalAmount;
            const currency = 'LKR';

            const hashRes = await api.post('/payments/hash', {
                order_id: orderId,
                amount: amount,
                currency: currency
            });

            const { hash, merchantId, amountFormatted } = hashRes.data;

            // 2. Define PayHere Params
            const payment = {
                "sandbox": true,
                "merchant_id": merchantId,        // Return URL: where user goes after payment
                "return_url": window.location.origin + "/parent/dashboard",
                "cancel_url": window.location.origin + "/parent/dashboard",
                "notify_url": `${import.meta.env.VITE_API_URL}/payments/notify`,
                "order_id": orderId,
                "items": "Student Registration",
                "amount": amountFormatted, // MUST match the hashed amount string exactly
                "currency": currency,
                "hash": hash,
                "first_name": user?.name?.split(' ')[0] || "Parent",
                "last_name": user?.name?.split(' ').slice(1).join(' ') || "User",
                "email": user?.email || "parent@example.com",
                "phone": user?.phone || "0771234567",
                "address": "No.1, Galle Road",
                "city": "Colombo",
                "country": "Sri Lanka"
            };

            // 3. Start Payment
            window.payhere.startPayment(payment);

            // 4. Handle Completion
            window.payhere.onCompleted = async function onCompleted(orderId) {
                console.log("Payment completed. OrderID:" + orderId);
                try {
                    await api.put(`/payments/payhere-complete`, { paymentId: orderId });
                    setPaymentSuccess(true);
                } catch (e) {
                    console.error(e);
                    toast.success("Payment received! Your account will be activated shortly.");
                    navigate('/parent/dashboard');
                }
            };

            window.payhere.onDismissed = function onDismissed() {
                console.log("Payment dismissed");
            };

            window.payhere.onError = function onError(error) {
                console.log("Error:" + error);
                toast.error("Payment Error: " + error);
            };

        } catch (err) {
            console.error(err);
            toast.error("Failed to initiate payment");
        }
    };

    const handleSubjectToggle = (subId) => {
        setFormData(prev => {
            const exists = prev.SubjectIDs.includes(subId);
            if (exists) {
                return { ...prev, SubjectIDs: prev.SubjectIDs.filter(id => id !== subId) };
            } else {
                // Find the subject being added
                const subjectToAdd = subjects.find(s => s.SubjectID === subId);

                // Filter out any *other* subject that has the same Name (e.g. "Maths")
                // This effectively swaps "Maths (English)" for "Maths (Tamil)" if validation is needed
                const newSubjectIDs = prev.SubjectIDs.filter(id => {
                    const existingSub = subjects.find(s => s.SubjectID === id);
                    return existingSub.SubjectName !== subjectToAdd.SubjectName;
                });

                return { ...prev, SubjectIDs: [...newSubjectIDs, subId] };
            }
        });
    };

    const calculateTotal = () => {
        const ADMISSION_FEE = 500;
        const subjectTotal = formData.SubjectIDs.reduce((acc, subId) => {
            const sub = subjects.find(s => s.SubjectID === subId);
            return acc + (sub ? parseFloat(sub.Fee) : 0);
        }, 0);
        return ADMISSION_FEE + subjectTotal;
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            const res = await api.post('/users/parent/students', {
                StudentName: formData.StudentName,
                Grade: formData.Grade,
                SubjectIDs: formData.SubjectIDs
            });
            setPaymentDetails(res.data);
            setStep(3); // Move to Payment
        } catch (err) {
            toast.error(err.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!refNo) return toast.error("Please enter a reference number");
        try {
            await api.put(`/payments/${paymentDetails.paymentId}/reference`, { referenceNo: refNo });
            toast.success("Registration complete! Enrollment pending approval.");
            navigate('/parent/dashboard');
        } catch (err) {
            console.error(err);
            toast.success("Registration complete! Please contact admin for approval.");
            navigate('/parent/dashboard');
        }
    };

    const downloadReceipt = async () => {
        if (!receiptRef.current) return;
        try {
            const canvas = await html2canvas(receiptRef.current);
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `Receipt_${paymentDetails.paymentId}.png`;
            link.click();
        } catch (err) {
            console.error("Receipt download failed", err);
            toast.error("Could not download receipt. Please check browser permissions.");
        }
    };

    if (paymentSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-xl rounded-2xl max-w-lg w-full p-8 animate-fade-in-up text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-6 shadow-sm">
                        ✓
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
                    <p className="text-slate-500 mb-8">Thank you for your payment. Your student registration is now complete.</p>

                    {/* Receipt Preview */}
                    <div className="flex justify-center mb-8">
                        <div ref={receiptRef} className="bg-white text-slate-900 p-6 rounded-lg shadow-xl border border-slate-200 max-w-sm w-full text-left font-mono relative overflow-hidden">
                            {/* Receipt Header */}
                            <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4 text-center">
                                <h3 className="text-xl font-bold uppercase tracking-wider text-slate-900">Theebam Education</h3>
                                <p className="text-xs text-slate-500">No 20, David road,
Jaffna, Sri Lanka</p>
                                <p className="text-xs text-slate-500">Tel: 077 123 4567</p>
                            </div>

                            {/* Receipt Body */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Date:</span>
                                    <span className="font-bold text-slate-700">{new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Order ID:</span>
                                    <span className="font-bold text-slate-700">{paymentDetails?.paymentId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Student:</span>
                                    <span className="font-bold text-slate-700">{formData.StudentName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Grade:</span>
                                    <span className="font-bold text-slate-700">{formData.Grade}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-b-2 border-dashed border-slate-300 my-4"></div>

                            {/* Total */}
                            <div className="flex justify-between items-center text-lg">
                                <span className="font-bold text-slate-900">TOTAL PAID</span>
                                <span className="font-bold text-emerald-600">LKR {paymentDetails?.totalAmount}</span>
                            </div>

                            {/* Footer */}
                            <div className="mt-6 text-center text-[10px] text-slate-400">
                                <p>Thank you for learning with us!</p>
                                <p>This is a computer generated receipt.</p>
                            </div>

                            {/* Decor */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={downloadReceipt}
                            className="w-full py-3 bg-white text-emerald-600 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-50 transition shadow-sm flex items-center justify-center gap-2"
                        >
                            <span>📥</span> Download Receipt
                        </button>
                        <button
                            onClick={() => navigate('/parent/dashboard')}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-blue-50 transition-colors duration-300">
            <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-xl rounded-2xl max-w-2xl w-full p-4 sm:p-6 md:p-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">Student Registration</h1>

                {/* Step Progress */}
                {/* Step Progress */}
                <div className="flex justify-between items-center mb-10 relative px-4">
                    <div className="absolute top-[15px] left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
                    <div className="absolute top-[15px] left-0 h-0.5 bg-blue-600 -z-0 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>

                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`relative z-10 flex flex-col items-center gap-2 ${step >= s ? 'text-blue-600' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-white' : 'bg-slate-50 border-2 border-slate-200'}`}>
                                {s}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide">{s === 1 ? 'Data' : s === 2 ? 'Subjects' : 'Payment'}</span>
                        </div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-700">Step 1: Student Details</h2>
                        <div>
                            <label className="block text-sm text-slate-500 mb-2">Student Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                value={formData.StudentName}
                                onChange={e => setFormData({ ...formData, StudentName: e.target.value })}
                                placeholder="Enter student's full name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-500 mb-2">Grade (6-9)</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                value={formData.Grade}
                                onChange={e => setFormData({ ...formData, Grade: e.target.value })}
                            >
                                <option value="" className="text-slate-400">Select Grade</option>
                                {[6, 7, 8, 9].map(g => <option key={g} value={g} className="text-slate-900">Grade {g}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => {
                                    if (formData.StudentName && formData.Grade) setStep(2);
                                    else toast.error("Please fill in student name and grade");
                                }}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-md"
                            >
                                Next: Select Subjects
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-700">Step 2: Subject Selection</h2>
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-blue-800">
                            <p className="text-sm">Please select subjects. Note the fees.</p>
                            <p className="text-sm font-bold mt-1">Admission Fee: 500 LKR (One-time)</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {subjects.map(sub => (
                                <div
                                    key={sub.SubjectID}
                                    className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 ${formData.SubjectIDs.includes(sub.SubjectID)
                                        ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                                        }`}
                                    onClick={() => handleSubjectToggle(sub.SubjectID)}
                                >
                                    <div className="flex justify-between items-center text-slate-700">
                                        <div>
                                            <p className="font-bold text-slate-800">{sub.SubjectName}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 font-medium bg-white px-2 py-0.5 rounded-full inline-block border border-slate-100">{sub.Medium} Medium</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-blue-600">{sub.Fee} LKR</p>
                                            {formData.SubjectIDs.includes(sub.SubjectID) && <span className="text-xs text-emerald-600 font-bold block">✓ Selected</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <div className="text-lg text-slate-800">
                                Total: <span className="font-bold text-emerald-600">{calculateTotal()} LKR</span>
                            </div>
                            <div className="space-x-3">
                                <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">Back</button>
                                <button
                                    onClick={handleRegister}
                                    disabled={loading || formData.SubjectIDs.length === 0}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-md disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Register & Pay'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && paymentDetails && (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl border border-emerald-200 shadow-sm">✓</div>
                        <h2 className="text-2xl font-bold text-slate-900">Registration Successful!</h2>
                        <p className="text-slate-500">Please complete the payment to finalize enrollment.</p>

                        <div className="bg-blue-50 border border-slate-200 p-6 rounded-xl text-left mx-auto max-w-md">
                            <div className="flex justify-between mb-2 text-slate-600">
                                <span>Student ID:</span>
                                <span className="font-mono text-slate-900 font-semibold">{paymentDetails.studentId}</span>
                            </div>
                            <div className="flex justify-between mb-2 text-slate-600">
                                <span>Total Amount:</span>
                                <span className="font-bold text-slate-900">{paymentDetails.totalAmount} LKR</span>
                            </div>

                            {/* Payment Mode Toggle */}
                            <div className="mt-6 flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                                <button
                                    className={`flex-1 py-2 rounded-md transition text-sm font-medium ${paymentMode === 'card' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                                    onClick={() => setPaymentMode('card')}
                                >
                                    Pay Online (Card)
                                </button>
                                <button
                                    className={`flex-1 py-2 rounded-md transition text-sm font-medium ${paymentMode === 'slip' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                                    onClick={() => setPaymentMode('slip')}
                                >
                                    Upload Receipt
                                </button>
                            </div>

                            {paymentMode === 'slip' ? (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="block text-sm font-medium mb-2 text-slate-700">Receipt Reference / Trans ID</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter reference number..."
                                        value={refNo}
                                        onChange={e => setRefNo(e.target.value)}
                                    />
                                    <div className="mt-2 text-xs text-slate-400">
                                        or <button className="text-blue-600 hover:text-blue-500 underline">Upload Receipt Image</button> (Use Dashboard for file upload)
                                    </div>
                                    <button
                                        onClick={handlePaymentSubmit}
                                        className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-md"
                                    >
                                        Confirm Payment
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-sm text-slate-500 mb-4">You will be redirected to PayHere secure gateway.</p>
                                    <button
                                        onClick={handlePayHerePayment}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex justify-center items-center gap-2 hover:bg-blue-700 transition shadow-md"
                                    >
                                        Pay {paymentDetails.totalAmount} LKR
                                    </button>
                                    <p className="text-xs text-center text-slate-400 mt-2">Secured by PayHere</p>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddStudent;
