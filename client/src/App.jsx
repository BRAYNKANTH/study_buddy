import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Menu, X } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import AddStudent from './pages/parent/AddStudent';
import TutorDashboard from './pages/tutor/TutorDashboard';

import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Import Assets
import logo from './assets/logo.jpeg';
import heroBg from './assets/hero_bg.png';
import aboutImg from './assets/about_us.png';

function LandingPage() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const contactFormRef = useRef(null);

    const handleContactSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const name = data.get('name')?.trim();
        const email = data.get('email')?.trim();
        const message = data.get('message')?.trim();
        if (!name || !email || !message) {
            toast.error('Please fill in all fields.');
            return;
        }
        // Show success — in production wire this to an email API
        toast.success("Message sent! We'll get back to you soon.");
        e.target.reset();
    };

    const scrollTo = (id) => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-header mx-4 my-4 px-6 py-3 flex justify-between items-center rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
                    <img src={logo} alt="Theebam" className="w-10 h-10 object-contain" />
                    <span className="text-xl font-bold tracking-wide text-slate-800">Theebam</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <button onClick={() => scrollTo('hero')} className="hover:text-blue-600 transition">Home</button>
                    <button onClick={() => scrollTo('about')} className="hover:text-blue-600 transition">About Us</button>
                    <button onClick={() => scrollTo('contact')} className="hover:text-blue-600 transition">Contact</button>
                </div>
                <div className="hidden md:flex items-center gap-4">
                    <button onClick={() => navigate('/login')} className="bg-white hover:bg-slate-50 px-4 py-2 rounded-lg transition text-sm font-medium border border-slate-200 text-slate-700 shadow-sm">
                        Login
                    </button>
                    <button onClick={() => navigate('/register')} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition text-sm font-medium text-white shadow-lg shadow-blue-900/10">
                        Sign Up
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-slate-700 p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle Menu"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden md:hidden flex flex-col p-4 space-y-4 animate-fade-in-up">
                        <button onClick={() => { scrollTo('hero'); setIsMenuOpen(false); }} className="text-left px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">Home</button>
                        <button onClick={() => { scrollTo('about'); setIsMenuOpen(false); }} className="text-left px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">About Us</button>
                        <button onClick={() => { scrollTo('contact'); setIsMenuOpen(false); }} className="text-left px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">Contact</button>
                        <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                            <button onClick={() => { navigate('/login'); setIsMenuOpen(false); }} className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-lg text-center font-medium text-slate-700">Login</button>
                            <button onClick={() => { navigate('/register'); setIsMenuOpen(false); }} className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg text-center font-medium text-white">Sign Up</button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 pt-20 bg-white">
                {/* Decorative background elements can be added here if needed, keeping it clean for now or using a light image */}
                <div className="absolute inset-0 z-0 opacity-30">
                    <img src={heroBg} alt="Background" className="w-full h-full object-cover" />
                </div>

                <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-4">
                        🎓 Excellence in Education
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-slate-900">
                        Empowering the <br />
                        <span className="text-blue-600">Next Generation</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
                        Theebam Education Centre provides a world-class learning environment connecting students, parents, and tutors seamlessly. Join us to unlock your full potential.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button onClick={() => navigate('/register')} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/20 transition transform hover:scale-105">
                            Get Started Now
                        </button>
                        <button onClick={() => scrollTo('about')} className="px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold text-lg transition">
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 px-4 relative bg-slate-50">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="order-2 md:order-1 relative">
                        <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 p-2 bg-white">
                            <img src={aboutImg} alt="About Us" className="w-full h-auto rounded-2xl" />
                        </div>
                    </div>

                    <div className="order-1 md:order-2 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Why Choose Theebam?</h2>
                        <div className="w-20 h-1 bg-blue-600 rounded-full"></div>
                        <p className="text-slate-600 leading-relaxed text-lg">
                            At Theebam, we believe that every student has unique potential waiting to be unlocked. Our personalized approach to education combines experienced mentorship with modern technology.
                        </p>
                        <ul className="space-y-4 pt-4">
                            {[
                                { title: 'Future-Ready Curriculum', desc: 'Staying ahead with modern learning paths.' },
                                { title: 'Expert Tutors', desc: 'Qualified professionals dedicated to your success.' },
                                { title: 'Real-time Progress', desc: 'Track academic growth with our parent portal.' }
                            ].map((item, idx) => (
                                <li key={idx} className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl flex-shrink-0 border border-blue-100">
                                        ✓
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                                        <p className="text-slate-500 text-sm">{item.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 px-4 relative bg-white">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Get in Touch</h2>
                    <p className="text-slate-500">Have questions? We'd love to hear from you.</p>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-6">
                        <div className="glass-card p-8 hover:bg-slate-50 transition">
                            <h3 className="text-xl font-bold mb-2 text-slate-800">📍 Visit Us</h3>
                            <p className="text-slate-600">No 20, David road,<br />Jaffna, Sri Lanka.</p>
                        </div>
                        <div className="glass-card p-8 hover:bg-slate-50 transition">
                            <h3 className="text-xl font-bold mb-2 text-slate-800">📞 Call Us</h3>
                            <p className="text-slate-600">+94 77 123 4567<br />+94 11 222 3333</p>
                        </div>
                        <div className="glass-card p-8 hover:bg-slate-50 transition">
                            <h3 className="text-xl font-bold mb-2 text-slate-800">✉️ Email Us</h3>
                            <p className="text-slate-600">info@theebam.edu.lk<br />support@theebam.edu.lk</p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="glass-card p-8 bg-slate-50">
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                                <input name="name" type="text" className="w-full px-4 py-3 glass-input outline-none rounded-xl" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input name="email" type="email" className="w-full px-4 py-3 glass-input outline-none rounded-xl" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                <textarea name="message" rows="4" className="w-full px-4 py-3 glass-input outline-none rounded-xl resize-none" placeholder="How can we help you?"></textarea>
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-200 bg-slate-50 text-center relative z-10">
                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 opacity-80">
                        <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                        <span className="font-semibold text-slate-700">Theebam Education</span>
                    </div>
                    <p className="text-sm text-slate-400">
                        &copy; {new Date().getFullYear()} All rights reserved.
                    </p>
                    <div className="flex gap-4 text-sm text-slate-500">
                        <a href="#" className="hover:text-blue-600 transition">Privacy Policy</a>
                        <a href="#" className="hover:text-blue-600 transition">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

import { Toaster } from 'react-hot-toast';

function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['teacher', 'tutor']} />}>
                        <Route path="/tutor/dashboard" element={<TutorDashboard />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                        <Route path="/parent/dashboard" element={<ParentDashboard />} />
                        <Route path="/parent/add-student" element={<AddStudent />} />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={
                        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                            <div className="text-center animate-fade-in-up">
                                <p className="text-7xl font-extrabold text-blue-600 mb-2">404</p>
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
                                <p className="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
                                <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition">
                                    ← Back to Home
                                </a>
                            </div>
                        </div>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    )
}

export default App;
