import React from 'react';

const ModuleCard = ({ title, description, grade, onClick, color }) => {
    return (
        <div onClick={onClick} className="glass-card p-6 flex flex-col h-full bg-white transition-all duration-300 group relative overflow-hidden cursor-pointer border border-blue-100/50 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 rounded-2xl shadow-sm">
            {/* Background Decor */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all`}></div>

            <div className="flex items-start justify-between mb-4 z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color || 'from-blue-600 to-indigo-600'} flex items-center justify-center text-xl shadow-lg shadow-blue-500/20 text-white`}>
                    📚
                </div>
                {grade && (
                    <span className="text-xs font-mono text-blue-600 border border-blue-200 px-2 py-1 rounded bg-blue-50">
                        Grade {grade}
                    </span>
                )}
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2 z-10 pr-4">{title}</h3>
            <p className="text-slate-500 text-sm mb-4 z-10">{description}</p>

            <div className="mt-auto z-10">
                <span className="text-blue-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Class <span className="text-lg">→</span>
                </span>
            </div>
        </div>
    );
};

export default ModuleCard;
