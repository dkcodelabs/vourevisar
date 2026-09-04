import { AnimatePresence, motion } from 'framer-motion';
import { Merge, RefreshCw } from 'lucide-react';
import {
    quickCreateAccentClasses,
    quickCreateOptions,
} from '@/utils/editaisQuickCreateConfig';

type EditaisHeaderActionsProps = {
    isMerging: boolean;
    selectedCount: number;
    onMerge: () => void;
    onOpenImport: (tab: 'ready' | 'ia' | 'manual') => void;
};

export function EditaisHeaderActions({
    isMerging,
    selectedCount,
    onMerge,
    onOpenImport,
}: EditaisHeaderActionsProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            <AnimatePresence>
                {selectedCount >= 2 && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={onMerge}
                        disabled={isMerging}
                        className="app-button-primary flex h-9 items-center gap-1.5 px-4 text-[9px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed"
                    >
                        {isMerging ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Merge size={14} />
                        )}
                        Mesclar ({selectedCount})
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2 lg:w-auto lg:min-w-[560px]">
                {quickCreateOptions.map((option) => {
                    const Icon = option.icon;
                    const accent = quickCreateAccentClasses[option.accent];

                    return (
                        <motion.button
                            key={option.id}
                            whileHover={{ y: -2, scale: 1.015 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onOpenImport(option.id)}
                            className={`group relative flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-secondary/60 px-3 py-2 text-left shadow-sm transition-all duration-200 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.03] ${accent.hover}`}
                        >
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-transform duration-200 group-hover:scale-110 ${accent.icon}`}>
                                <Icon size={14} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                    <span className="truncate text-[11px] font-black uppercase tracking-[0.08em] text-foreground">
                                        {option.title}
                                    </span>
                                    {option.badge && (
                                        <span className={`rounded px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-wider ${accent.badge}`}>
                                            {option.badge}
                                        </span>
                                    )}
                                </span>
                                <span className="block text-[10px] font-semibold leading-snug text-content-muted line-clamp-2">
                                    {option.description}
                                </span>
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
