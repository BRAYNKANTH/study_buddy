import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validation';
import { Eye, EyeOff } from 'lucide-react';
import illustration from '../assets/login-illustration.png';

const Login = () => {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Already logged in — replace /login in history with their dashboard
    if (user) {
        const dest = user.role === 'admin' ? '/admin/dashboard'
                   : user.role === 'teacher' ? '/tutor/dashboard'
                   : '/parent/dashboard';
        return <Navigate to={dest} replace />;
    }

    // Default form data without role
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Verification States
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifying, setVerifying] = useState(false); // True if entering OTP
    const [otp, setOtp] = useState('');
    const [verificationTarget, setVerificationTarget] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validation
        const isEmail = validateEmail(formData.email);

        // We allow both email/phone in the email field, so we just check it's not empty essentially, 
        // but if it looks like an email it should be valid.
        if (!formData.email) return setError("Please enter your email or phone.");
        if (!formData.password) return setError("Please enter your password.");

        setLoading(true);

        const res = await login(formData.email, formData.password);

        setLoading(false);
        if (res.success) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                switch (user.role) {
                    case 'admin': navigate('/admin/dashboard'); break;
                    case 'teacher':
                    case 'tutor': navigate('/tutor/dashboard'); break;
                    case 'parent': navigate('/parent/dashboard'); break;
                    default: navigate('/');
                }
            } else {
                navigate('/');
            }
        } else {
            // Check for Unverified Account
            if (res.isVerified === false) {
                setError("Account exists but is not verified.");
                setShowVerifyModal(true);
            }
            else {
                setError(res.message);
            }
        }
    };

    // Resend OTP & Start Verification
    const startVerification = async (method) => {
        setShowVerifyModal(false);
        setLoading(true);
        try {
            // Use API directly since auth context might not have resend wrapper yet or we want custom behavior
            const api = (await import('../api/axios')).default;
            await api.post('/auth/resend-otp', {
                email: formData.email,
                verificationMethod: method
            });
            setLoading(false);
            setVerificationTarget(method === 'phone' ? 'your phone' : 'your email');
            setVerifying(true); // Switch to OTP input view
        } catch (err) {
            setLoading(false);
            setError("Failed to send verification code.");
        }
    };

    // Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const api = (await import('../api/axios')).default;
            await api.post('/auth/verify-otp', {
                email: formData.email,
                code: otp
            });
            setLoading(false);
            toast.success("Verified! Please login.");
            setVerifying(false);
            setOtp('');
            // Optional: Auto-login here, but simple flow is ask to login again
        } catch (err) {
            setLoading(false);
            setError("Invalid OTP.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="relative max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 glass-card overflow-hidden animate-fade-in-up border border-blue-100 shadow-2xl shadow-blue-900/10 rounded-3xl">

                {/* Form Section (Left) */}
                <div className="p-6 md:p-16 flex flex-col justify-center bg-white">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900">{verifying ? 'Verify Account' : 'Welcome Back'}</h2>
                        <p className="text-slate-500 mt-2 font-light">{verifying ? `Enter code sent to ${verificationTarget}` : 'Sign in to start learning'}</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {!verifying ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email or Phone</label>
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 glass-input outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                                    placeholder="Enter your email or phone"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 glass-input outline-none focus:ring-2 focus:ring-blue-500/20 transition pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-2">
                                    <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 transition font-medium">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 glass-button rounded-xl font-bold tracking-wide shadow-lg shadow-blue-900/10"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="text-center mt-6">
                                <span className="text-slate-500 text-sm">New to Study Buddy? </span>
                                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition ml-1">
                                    Create Account
                                </Link>
                            </div>
                        </form>
                    ) : (
                        // OTP Verification Form
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center mb-4">
                                <p className="text-sm text-slate-500">Code sent to</p>
                                <p className="font-semibold text-slate-900 tracking-wide">{verificationTarget}</p>
                            </div>

                            <input
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-4 glass-input text-center text-2xl sm:text-4xl tracking-[0.3em] sm:tracking-[0.5em] font-bold font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:text-slate-400 text-slate-900"
                                placeholder="000000"
                                maxLength="6"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-bold tracking-wide"
                            >
                                {loading ? 'Verifying...' : 'Verify & Login'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setVerifying(false)}
                                className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm transition mt-2"
                            >
                                ← Cancel Verification
                            </button>
                        </form>
                    )}
                </div>

                {/* Image Section (Right) */}
                <div className="hidden md:flex flex-col justify-center items-center relative bg-slate-50 p-10 text-center border-l border-slate-200">
                    <div className="relative z-10 max-w-sm">
                        <img src={illustration} alt="Study Illustration" className="w-full drop-shadow-xl rounded-2xl mb-8 transform hover:scale-105 transition duration-500" />
                        <h3 className="text-3xl font-bold text-slate-900 mb-3">Empower Your Learning</h3>
                        <p className="text-slate-600 text-lg leading-relaxed">Join thousands of students and tutors achieving academic excellence together.</p>
                    </div>
                </div>

                {/* Verification Method Modal */}
                {showVerifyModal && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Verify Account</h3>
                            <p className="text-slate-500 text-sm mb-6">Your account exists but needs verification before access.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => startVerification('email')}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📩</span>
                                        <div className="text-left">
                                            <div className="font-semibold text-slate-800">Email Verification</div>
                                            <div className="text-xs text-slate-500">Receive code via Email</div>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
                                </button>

                                <button
                                    onClick={() => startVerification('phone')}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📱</span>
                                        <div className="text-left">
                                            <div className="font-semibold text-slate-800">SMS Verification</div>
                                            <div className="text-xs text-slate-500">Receive code via Phone</div>
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

export default Login;
