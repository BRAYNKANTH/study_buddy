/**
 * EmptyState — reusable zero-data placeholder with icon, title, subtitle and optional CTA.
 *
 * Usage:
 *   <EmptyState icon="🎓" title="No Students" subtitle="Add a student to get started." />
 *   <EmptyState icon="💳" title="No Payments" action={() => navigate('/pay')} actionLabel="Make Payment" />
 */
const EmptyState = ({
    icon = '📭',
    title = 'Nothing here yet',
    subtitle,
    action,
    actionLabel = 'Get Started',
    className = '',
}) => (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
        {/* Pulsing ring + icon */}
        <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-blue-50 scale-125 opacity-50 animate-pulse" />
            <div className="relative w-20 h-20 bg-white border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center text-4xl shadow-sm">
                {icon}
            </div>
        </div>

        <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>

        {subtitle && (
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{subtitle}</p>
        )}

        {action && (
            <button
                onClick={action}
                className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
                {actionLabel}
            </button>
        )}
    </div>
);

export default EmptyState;
