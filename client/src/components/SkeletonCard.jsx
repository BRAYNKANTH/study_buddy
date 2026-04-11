/** Generic skeleton loader — replaces "Loading..." text throughout the app */
const SkeletonCard = ({ count = 3, height = 'h-32' }) => (
    <>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={`skeleton ${height} rounded-2xl`} />
        ))}
    </>
);

export const SkeletonTable = ({ rows = 4, cols = 4 }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3">
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="skeleton h-3 rounded flex-1" style={{ opacity: 1 - j * 0.15 }} />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonStat = ({ count = 4 }) => (
    <>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-7 w-16 rounded" />
            </div>
        ))}
    </>
);

export default SkeletonCard;
