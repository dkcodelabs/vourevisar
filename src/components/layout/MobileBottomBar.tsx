import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Clock, Target, List } from "lucide-react";

const mobileNavItems = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { to: "/ciclo-estudos", label: "Ciclo", icon: Target },
    { to: "/revisoes", label: "Revisões", icon: Clock },
    { to: "/materias", label: "Matérias", icon: BookOpen },
    { to: "/topicos", label: "Tópicos", icon: List },
];

export const MobileBottomBar = () => {
    const location = useLocation();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 pb-safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16">
                {mobileNavItems.map((item) => {
                    const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors ${isActive
                                ? 'text-brand-blue'
                                : 'text-muted-foreground'
                                }`}
                        >
                            <item.icon size={20} className={isActive ? 'animate-in fade-in zoom-in duration-300' : ''} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-blue" />
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};
