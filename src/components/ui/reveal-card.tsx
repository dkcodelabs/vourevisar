import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

// Tipos para as props do componente
interface RevealCardProps {
    children: React.ReactNode
    className?: string
    variant?: "default" | "glass" | "gradient" | "bordered"
    animation?: "flip" | "slide" | "fade" | "scale"
    height?: "auto" | "fixed"
}

interface RevealCardFrontProps {
    children: React.ReactNode
    className?: string
    icon?: LucideIcon
    iconColor?: string
    title?: string
    subtitle?: string
}

interface RevealCardBackProps {
    children: React.ReactNode
    className?: string
    showOnHover?: boolean
}

// ============ RevealCard (Container Principal) ============
const RevealCard = React.forwardRef<HTMLDivElement, RevealCardProps>(
    ({ children, className, variant = "default", animation = "slide", height = "auto" }, ref) => {
        const variants = {
            default: "bg-card border-border hover:border-primary/30",
            glass: "bg-white/10 dark:bg-black/20 backdrop-blur-xl border-white/20 dark:border-white/10",
            gradient: "bg-gradient-to-br from-card to-primary/5 border-transparent",
            bordered: "bg-transparent border-2 border-dashed border-primary/30 hover:border-primary/60",
        }

        const animations = {
            flip: "perspective-1000",
            slide: "group",
            fade: "group",
            scale: "group",
        }

        const heights = {
            auto: "h-auto",
            fixed: "h-48",
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-2xl border shadow-lg transition-all duration-500",
                    variants[variant],
                    animations[animation],
                    heights[height],
                    className
                )}
            >
                {children}
            </div>
        )
    }
)
RevealCard.displayName = "RevealCard"

// ============ RevealCardFront (Conteúdo Visível) ============
const RevealCardFront = React.forwardRef<HTMLDivElement, RevealCardFrontProps>(
    ({ children, className, icon: Icon, iconColor = "text-primary", title, subtitle }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative z-10 p-6 h-full flex flex-col items-center justify-center text-center transition-all duration-500",
                    "group-hover:opacity-0 group-hover:pointer-events-none",
                    className
                )}
            >
                {Icon && (
                    <div className={cn("mb-4 p-4 rounded-2xl bg-primary/10", iconColor)}>
                        <Icon size={32} strokeWidth={1.5} />
                    </div>
                )}
                {title && (
                    <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
                )}
                {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
                {children}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-50">
                    <span className="text-xs text-muted-foreground animate-bounce">Hover para detalhes</span>
                </div>
            </div>
        )
    }
)
RevealCardFront.displayName = "RevealCardFront"

// ============ RevealCardBack (Conteúdo Revelado no Hover) ============
const RevealCardBack = React.forwardRef<HTMLDivElement, RevealCardBackProps>(
    ({ children, className, showOnHover = true }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "absolute inset-0 z-20 p-6 bg-gradient-to-br from-primary/5 via-background to-primary/10",
                    "transition-all duration-500 ease-out",
                    // Estado inicial - escondido
                    showOnHover && "opacity-0 translate-y-4 scale-95",
                    // Estado no hover - revelado
                    "group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100",
                    // Animações específicas por tipo
                    "data-[animation=flip]:group-hover:rotate-y-180",
                    "data-[animation=slide]:translate-y-full group-hover:data-[animation=slide]:translate-y-0",
                    "data-[animation=fade]:opacity-0 group-hover:data-[animation=fade]:opacity-100",
                    "data-[animation=scale]:scale-0 group-hover:data-[animation=scale]:scale-100",
                    className
                )}
                style={{
                    transformStyle: "preserve-3d",
                }}
            >
                <div className="h-full overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        )
    }
)
RevealCardBack.displayName = "RevealCardBack"

// ============ Componente de Card Simples com Hover ============
interface HoverRevealCardProps {
    front?: React.ReactNode
    back?: React.ReactNode
    children?: React.ReactNode
    className?: string
    variant?: "default" | "glass" | "gradient"
}

const HoverRevealCard = React.forwardRef<HTMLDivElement, HoverRevealCardProps>(
    ({ front, back, children, className, variant = "default" }, ref) => {
        const variants = {
            default: "bg-card border-border",
            glass: "bg-white/10 dark:bg-black/20 backdrop-blur-xl border-white/20",
            gradient: "bg-gradient-to-br from-primary/10 via-card to-primary/5",
        }

        // Se children for fornecido, usa o formato padrão com children[0] como frente e children[1] como verso
        const frontContent = front || (children ? (children as React.ReactNode[])[0] : null);
        const backContent = back || (children ? (children as React.ReactNode[])[1] : null);

        return (
            <div
                ref={ref}
                className={cn(
                    "group relative overflow-hidden rounded-2xl border shadow-lg transition-all duration-500 hover:shadow-xl hover:border-primary/30",
                    variants[variant],
                    className
                )}
            >
                {/* Frente */}
                <div className="transition-all duration-500 group-hover:opacity-0 group-hover:-translate-y-4">
                    {frontContent}
                </div>

                {/* Verso - Revelado no hover */}
                <div className="absolute inset-0 transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0">
                    {backContent}
                </div>
            </div>
        )
    }
)
HoverRevealCard.displayName = "HoverRevealCard"

// ============ Card de Estatísticas com Hover ============
interface StatsRevealCardProps {
    icon: LucideIcon
    iconColor?: string
    title: string
    value: string | number
    description?: string
    details?: React.ReactNode
    children?: React.ReactNode
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

const StatsRevealCard = React.forwardRef<HTMLDivElement, StatsRevealCardProps>(
    ({ icon: Icon, iconColor = "text-primary", title, value, description, details, children, trend, className }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-lg",
                    "transition-all duration-500 hover:shadow-xl hover:border-primary/30",
                    className
                )}
            >
                {/* Frente do card */}
                <div className="flex items-start justify-between transition-all duration-500 group-hover:opacity-0">
                    <div>
                        <div className={cn("mb-3 p-2.5 rounded-xl bg-primary/10 w-fit", iconColor)}>
                            <Icon size={22} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                        <p className="text-3xl font-bold text-foreground">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        )}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-sm font-medium",
                            trend.isPositive ? "text-green-500" : "text-red-500"
                        )}>
                            <span>{trend.isPositive ? "↑" : "↓"}</span>
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>

                {/* Detalhes revelados no hover */}
                <div className="absolute inset-0 p-6 transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0">
                    <div className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={cn("p-2 rounded-lg bg-primary/20", iconColor)}>
                                <Icon size={18} />
                            </div>
                            <span className="font-semibold text-foreground">{title}</span>
                        </div>
                        {details ? details : (
                            <div className="flex-1 flex items-center justify-center">
                                {children || (
                                    <p className="text-center text-muted-foreground text-sm">
                                        Continue estudando para melhorar seus resultados!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }
)
StatsRevealCard.displayName = "StatsRevealCard"

// ============ Card de Matéria com Hover ============
interface SubjectRevealCardProps {
    name: string
    topicCount: number
    completedTopics: number
    status: "Nova" | "Em Estudo" | "Concluída"
    lastStudied?: string
    nextReview?: string
    icons?: {
        progress?: React.ReactNode
        actions?: React.ReactNode
    }
    onClick?: () => void
    className?: string
}

const SubjectRevealCard = React.forwardRef<HTMLDivElement, SubjectRevealCardProps>(
    ({ name, topicCount, completedTopics, status, lastStudied, nextReview, icons, onClick, className }, ref) => {
        const progress = topicCount > 0 ? Math.round((completedTopics / topicCount) * 100) : 0

        const statusColors = {
            "Nova": "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
            "Em Estudo": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
            "Concluída": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
        }

        return (
            <div
                ref={ref}
                onClick={onClick}
                className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-card cursor-pointer",
                    "transition-all duration-500 hover:shadow-xl hover:border-primary/40 hover:scale-[1.02]",
                    className
                )}
            >
                {/* Frente */}
                <div className="p-5 transition-all duration-500 group-hover:opacity-0 group-hover:pointer-events-none">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-foreground line-clamp-1">{name}</h3>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            statusColors[status]
                        )}>
                            {status}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {completedTopics} de {topicCount} tópicos concluídos
                        </p>
                    </div>
                </div>

                {/* Verso - Detalhes */}
                <div className="absolute inset-0 p-5 transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0">
                    <div className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <span className="font-semibold text-foreground">{name}</span>
                        </div>

                        <div className="flex-1 space-y-3">
                            {lastStudied && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Último estudo:</span>
                                    <span className="font-medium">{lastStudied}</span>
                                </div>
                            )}
                            {nextReview && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Próxima revisão:</span>
                                    <span className="font-medium text-primary">{nextReview}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                                    <p className="text-2xl font-bold text-primary">{completedTopics}</p>
                                    <p className="text-xs text-muted-foreground">Concluídos</p>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                                    <p className="text-2xl font-bold text-foreground">{topicCount - completedTopics}</p>
                                    <p className="text-xs text-muted-foreground">Restantes</p>
                                </div>
                            </div>
                        </div>

                        {(icons?.progress || icons?.actions) && (
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                {icons?.progress}
                                {icons?.actions}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }
)
SubjectRevealCard.displayName = "SubjectRevealCard"

export {
    RevealCard,
    RevealCardFront,
    RevealCardBack,
    HoverRevealCard,
    StatsRevealCard,
    SubjectRevealCard,
}
