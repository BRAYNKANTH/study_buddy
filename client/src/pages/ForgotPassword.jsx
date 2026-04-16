import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { validateEmail, validatePhone, validatePassword, getPasswordStrengthMsg } from '../utils/validation';
import { Eye, EyeOff, Mail, Phone, KeyRound, ShieldCheck } from 'lucide-react';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Pass
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');

    // Step 2 Data
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Send OTP
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        const isEmail = validateEmail(email);
        const isPhone = validatePhone(email);

        if (!isEmail && !isPhone) return setError("Please enter a valid email or phone number (e.g., 077...).");

        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setLoading(false);
            setStep(2);
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || "User not found");
        }
    };

    // Step 2: Verify Code Only
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Check OTP without consuming it
            await api.post('/auth/verify-otp', {
                email,
                code: otp,
                type: 'PASSWORD_RESET',
                dryRun: true
            });
            setLoading(false);
            setStep(3); // Move to Password Step
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || "Invalid Code");
        }
    };

    // Step 3: Reset Password
    const handleReset = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!validatePassword(newPassword)) {
            setError("Weak Password: " + getPasswordStrengthMsg(newPassword));
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email,
                code: otp,
                newPassword
            });
            setLoading(false);
            toast.success("Password Reset Successful! Please login.");
            navigate('/login');
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || "Reset failed. Invalid OTP?");
        }
    };

    const steps = [
        { num: 1, label: 'Identify', icon: Mail },
        { num: 2, label: 'Verify', icon: ShieldCheck },
        { num: 3, label: 'Reset', icon: KeyRound },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="glass-card max-w-md w-full p-8 animate-fade-in-up border border-blue-100 shadow-2xl shadow-blue-900/10 rounded-3xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-4">
                        <KeyRound size={26} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
                    <p className="text-slate-500 mt-1 text-sm">Recover your account access</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all
                                ${step > s.num ? 'bg-emerald-500 text-white' : step === s.num ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                                {step > s.num ? '✓' : s.num}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${step === s.num ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
                            {i < steps.length - 1 && <div className={`w-8 h-0.5 ${step > s.num ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleSendOTP} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address or Phone Number</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 glass-input outline-none"
                                placeholder="user@example.com or 077..."
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3.5 glass-button rounded-xl font-semibold tracking-wide disabled:opacity-50">
                            {loading ? 'Sending OTP...' : 'Send Verification Code →'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyCode} className="space-y-5">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                            <p className="text-sm text-slate-500">Verification code sent to</p>
                            <p className="font-semibold text-slate-900 tracking-wide mt-0.5">{email}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Enter 6-digit Code</label>
                            <input
                                type="text"
                                name="verify_code_otp"
                                autoComplete="off"
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                className="w-full px-4 py-4 glass-input outline-none text-center text-3xl tracking-[0.5em] font-bold font-mono placeholder:text-xl placeholder:tracking-normal placeholder:font-sans text-slate-900"
                                maxLength="6"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3.5 glass-button rounded-xl font-semibold tracking-wide disabled:opacity-50">
                            {loading ? 'Verifying...' : 'Verify Code →'}
                        </button>

                        <ResendTimer
                            onResend={async () => {
                                try {
                                    const isPhone = /^\d+$/.test(email.replace('+', ''));
                                    await api.post('/auth/resend-otp', {
                                        email: email,
                                        verificationMethod: isPhone ? 'phone' : 'email'
                                    });
                                    toast.success("New code sent!");
                                } catch (err) {
                                    toast.error("Failed to resend code");
                                }
                            }}
                        />
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleReset} className="space-y-5">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                            <p className="text-emerald-700 font-semibold text-sm">✓ Identity Verified</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="Min 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 glass-input outline-none transition pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Repeat password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 glass-input outline-none transition pr-12"
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
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3.5 glass-button rounded-xl font-semibold shadow-lg shadow-blue-900/10 transition disabled:opacity-50">
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center text-sm">
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

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
                <p className="text-sm text-slate-500">Resend code in <span className="font-bold text-slate-700">{timeLeft}s</span></p>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setTimeLeft(30);
                        onResend();
                    }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition"
                >
                    Resend Code
                </button>
            )}
        </div>
    );
};
