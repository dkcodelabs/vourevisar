import { Library, Plus, Sparkles, type LucideIcon } from 'lucide-react';

export type QuickCreateOption = {
    id: 'ready' | 'ia' | 'manual';
    title: string;
    description: string;
    icon: LucideIcon;
    accent: 'cyan' | 'emerald' | 'amber';
    badge?: string;
};

export const quickCreateOptions: QuickCreateOption[] = [
    { id: 'ready', title: 'Catálogo', description: 'Modelos prontos', icon: Library, accent: 'cyan' },
    { id: 'ia', title: 'IA', description: 'Importar edital', icon: Sparkles, accent: 'emerald' },
    { id: 'manual', title: 'Manual', description: 'Criar do zero', icon: Plus, accent: 'amber' },
];

export const quickCreateAccentClasses = {
    cyan: {
        icon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        hover: 'hover:border-cyan-500/50 hover:bg-cyan-500/[0.08] hover:shadow-cyan-500/15',
        badge: 'bg-cyan-400 text-zinc-950',
    },
    emerald: {
        icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        hover: 'hover:border-emerald-500/50 hover:bg-emerald-500/[0.08] hover:shadow-emerald-500/15',
        badge: 'bg-emerald-400 text-zinc-950',
    },
    amber: {
        icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        hover: 'hover:border-amber-500/50 hover:bg-amber-500/[0.08] hover:shadow-amber-500/15',
        badge: 'bg-amber-400 text-zinc-950',
    },
} as const;
