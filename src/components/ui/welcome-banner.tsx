import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface WelcomeBannerProps {
    title: string;
    description: string;
    badgeText?: string;
    className?: string;
}

export const WelcomeBanner = ({ title, description, badgeText, className = "" }: WelcomeBannerProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`rounded-2xl overflow-hidden relative ${className}`}
        >
            {/* Fundo gradiente */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-primary/8 to-emerald-500/5 dark:from-emerald-500/15 dark:via-primary/10 dark:to-emerald-500/8" />
            <div className="absolute inset-0 border border-emerald-500/20 dark:border-emerald-500/25 rounded-2xl" />

            <div className="relative flex items-center gap-4 px-5 py-4">
                {/* Ícone */}
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Info size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 leading-tight">
                        {title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Badge */}
                {badgeText && (
                    <div className="shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            {badgeText}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
