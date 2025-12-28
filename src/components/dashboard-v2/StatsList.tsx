import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface StatItem {
    icon: LucideIcon;
    label: string;
    value: string | number;
    variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple';
    onClick?: () => void;
}

interface StatsListProps {
    items: StatItem[];
}

export const StatsList: React.FC<StatsListProps> = ({ items }) => {
    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(
                        "flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-all duration-200",
                        item.onClick && "cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                    )}
                    onClick={item.onClick}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            getVariantStyles(item.variant)
                        )}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {item.label}
                        </span>
                    </div>
                    <span className={cn(
                        "text-lg font-bold",
                        getTextVariantStyles(item.variant)
                    )}>
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

function getVariantStyles(variant?: StatItem['variant']) {
    switch (variant) {
        case 'success': return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
        case 'danger': return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
        case 'warning': return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
        case 'info': return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
        case 'purple': return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
        default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
}

function getTextVariantStyles(variant?: StatItem['variant']) {
    switch (variant) {
        case 'success': return "text-green-600 dark:text-green-400";
        case 'danger': return "text-red-600 dark:text-red-400";
        case 'warning': return "text-orange-600 dark:text-orange-400";
        case 'info': return "text-blue-600 dark:text-blue-400";
        case 'purple': return "text-purple-600 dark:text-purple-400"; // Added purple text style
        default: return "text-slate-900 dark:text-slate-100"; // Stronger default text
    }
}
