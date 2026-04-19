import { LogOut, Settings } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

/**
 * Reusable dashboard header used by all 3 dashboards.
 * Props:
 *   title        — page title
 *   subtitle     — welcome line
 *   onLogout     — logout handler
 *   onSettings   — optional settings handler (shows button if provided)
 *   extra        — any extra JSX to render in the right slot
 */
const PageHeader = ({ title, subtitle, onLogout, onSettings, extra }) => (
    <div className="relative rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 p-4 md:p-6 flex flex-row justify-between items-center">
        {/* Decorative blobs limited to header bounds */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-blue-500/30 rounded-full blur-2xl" />
        </div>

        {/* Left — title */}
        <div className="relative z-10 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-blue-100 mt-0.5 text-sm truncate">{subtitle}</p>}
        </div>

        {/* Right — actions */}
        <div className="relative z-10 flex items-center gap-2 md:gap-3 flex-shrink-0 ml-3">
            {extra}
            <NotificationCenter />
            {onSettings && (
                <button
                    onClick={onSettings}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition text-sm font-medium"
                >
                    <Settings size={15} />
                    <span>Settings</span>
                </button>
            )}
            <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl transition font-bold text-sm shadow-sm"
            >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
            </button>
        </div>
    </div>
);

export default PageHeader;
