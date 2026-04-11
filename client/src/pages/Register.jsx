import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { validateEmail, validatePhone, validatePassword, validateName, getPasswordStrengthMsg } from '../utils/validation';

import { Eye, EyeOff } from 'lucide-react';
import illustration from '../assets/login-illustration.png';

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Details, 2: OTP
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showVerifyModal, setShowVerifyModal] = useState(false);

    // Password Visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const [otp, setOtp] = useState('');
    const [verificationTarget, setVerificationTarget] = useState(''); // Store where OTP was sent

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Step 1: Pre-Register (Show Modal)
    const handleRegister = (e) => {
        e.preventDefault();
        setError('');

        // Valdiation Checks
        if (!validateName(formData.fullName)) return setError("Full Name must be at least 3 characters.");
        if (!validateEmail(formData.email)) return setError("Please enter a valid email address.");
        if (!validatePhone(formData.phone)) return setError("Phone must be exactly 10 digits (e.g., 0771234567).");
        if (!validatePassword(formData.password)) return setError("Weak Password: " + getPasswordStrengthMsg(formData.password));
        if (formData.password !== formData.confirmPassword) return setError("Passwords do not match.");

        // Show selection modal
        setShowVerifyModal(true);
    };

    // Confirm Registration with selected method
    const confirmRegister = async (method) => {
        setShowVerifyModal(false);
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/register/parent', {
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                verificationMethod: method
            });
            setLoading(false);
            setVerificationTarget(method === 'phone' ? formData.phone : formData.email);
            setStep(2); // Move to OTP step
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || "Registration failed");
        }
    };

    // Step 2: Verify OTP
    const handleVerifyCalls = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/verify-otp', {
                email: formData.email, // Always identify by email
                code: otp
            });
            setLoading(false);
            toast.success("Account Verified! You can now login.");
            navigate('/login');
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || "Invalid OTP");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="relative max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 glass-card overflow-hidden animate-fade-in-up border border-blue-100 shadow-2xl shadow-blue-900/10 rounded-3xl">

                {/* Form Section (Left) */}
                <div className="p-10 md:p-12 flex flex-col justify-center bg-white">
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
                        <p className="text-slate-500 mt-2 font-light">Parent Registration</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Full Name</label>
                                <input name="fullName" placeholder="e.g. braynkanth" value={formData.fullName} onChange={handleChange} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Email</label>
                                    <input name="email" type="email" placeholder="braynkanth@gmail.com" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Phone</label>
                                    <input name="phone" placeholder="07...." value={formData.phone} onChange={handleChange} required className="w-full px-4 py-3 glass-input outline-none transition focus:ring-1 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Min 6 characters"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 glass-input outline-none transition pr-12 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Repeat Password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 glass-input outline-none transition pr-12 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3.5 glass-button rounded-xl font-bold tracking-wide mt-4 shadow-lg shadow-blue-900/10">
                                {loading ? 'Processing...' : 'Next Step →'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyCalls} className="space-y-6">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                            >
                                ← Back to details
                            </button>

                            <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-sm text-slate-500">Verification Code sent to</p>
                                <p className="font-bold text-slate-900 text-lg">{verificationTarget}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm text-slate-600">Enter Code</label>
                                <input name="otp" placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full px-4 py-4 glass-input text-center text-3xl tracking-[0.5em] font-mono font-bold text-slate-900" maxLength="6" />
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-bold">
                                {loading ? 'Verifying...' : 'Verify & Setup'}
                            </button>

                            <ResendTimer
                                onResend={async () => {
                                    try {
                                        await api.post('/auth/resend-otp', {
                                            email: formData.email,
                                            verificationMethod: verificationTarget === formData.phone ? 'phone' : 'email'
                                        });
                                        toast.success("New Code Sent!");
                                    } catch (err) {
                                        toast.error("Failed to resend code");
                                    }
                                }}
                            />
                        </form>
                    )}

                    <div className="mt-8 text-center text-sm text-slate-500">
                        Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition">Sign in</Link>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className="hidden md:flex flex-col justify-center items-center relative bg-slate-50 p-10 text-center border-l border-slate-200">
                    <img src={illustration} alt="Study Illustration" className="w-[85%] drop-shadow-xl rounded-2xl mb-8 transform -rotate-3 hover:rotate-0 transition duration-700 ease-out" />
                    <div className="relative z-10 max-w-sm">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Join the Community</h3>
                        <p className="text-slate-600 text-base">Track progress, manage classes, and help your child succeed with Study Buddy.</p>
                    </div>
                </div>

                {/* Verification Method Modal */}
                {showVerifyModal && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Quick Verify</h3>
                            <p className="text-slate-500 text-sm mb-6">How should we send the confirmation code?</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => confirmRegister('email')}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📩</span>
                                        <div className="text-left">
                                            <div className="font-semibold text-slate-800">Email</div>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
                                </button>
                                <button
                                    onClick={() => confirmRegister('phone')}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📱</span>
                                        <div className="text-left">
                                            <div className="font-semibold text-slate-800">SMS</div>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowVerifyModal(false)}
                                className="mt-6 w-full py-2 text-slate-500 hover:text-slate-700 text-sm transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;

const ResendTimer = ({ onResend }) => {
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (timeLeft === 0) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    return (
        <div className="text-center mt-4">
            {timeLeft > 0 ? (
                <p className="text-sm text-slate-400">Resend code in <span className="font-bold text-slate-600">{timeLeft}s</span></p>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setTimeLeft(30);
                        onResend();
                    }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 transition"
                >
                    Resend Code
                </button>
            )}
        </div>
    );
};
