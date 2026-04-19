const BottomNav = ({ items, activeTab, onTabChange }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
            {/* Blur backdrop */}
            <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 pb-safe">
                <div className="flex items-center justify-around max-w-lg mx-auto">
                    {items.map((item) => {
                        const isActive = activeTab === item.id || (item.matchTabs?.includes(activeTab));
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-all duration-200 relative ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
                                )}

                                {/* Icon */}
                                <div className={`relative transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                                    <span className="text-xl leading-none">{item.icon}</span>
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold shadow animate-pulse">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </div>

                                {/* Label */}
                                <span className={`text-[10px] font-semibold mt-0.5 leading-none ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNav;
