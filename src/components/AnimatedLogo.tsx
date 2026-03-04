import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
    collapsed?: boolean;
    className?: string;
    onClick?: () => void;
    isRepeating?: boolean;
}

export function AnimatedLogo({ collapsed = false, className = '', onClick, isRepeating = false }: AnimatedLogoProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [animationState, setAnimationState] = useState<'none' | 'animating' | 'static'>(
        collapsed ? 'none' : 'static'
    );
    const prevCollapsed = useRef(collapsed);

    // Controla se deve animar baseado na transição de collapsed
    useEffect(() => {
        // Se mudou de collapsed=true para collapsed=false, dispara a animação
        if (prevCollapsed.current === true && collapsed === false) {
            setAnimationState('animating');
        }

        // Se mudou para collapsed=true, reseta o estado
        if (collapsed === true) {
            setAnimationState('none');
        }

        prevCollapsed.current = collapsed;
    }, [collapsed]);

    const replayAnimations = useCallback(() => {
        setAnimationState('none');
        setTimeout(() => {
            setAnimationState('animating');
        }, 10);
    }, []);

    const handleReplay = (e: React.MouseEvent) => {
        if (onClick) onClick();
        replayAnimations();
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                `relative cursor-pointer flex items-center gap-2 overflow-hidden`,
                animationState === 'animating' ? "logo-animate" : "",
                animationState === 'static' ? "logo-static" : "",
                isRepeating ? "logo-repeating" : "",
                className
            )}
            onClick={handleReplay}
            title="Clique para reiniciar a animação"
        >
            {/* O ícone SVG (Renderizado apenas se NÃO estiver collapsed) */}
            {!collapsed && (
                <div className={cn(
                    "w-[84px] h-[52px] shrink-0 flex items-center justify-center transition-all duration-300 -ml-1"
                )}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="150 100 500 350"
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <defs>
                            <linearGradient id="neonGradientGraph" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ff7b00" />
                                <stop offset="50%" stopColor="#ffea00" />
                                <stop offset="100%" stopColor="#00ff87" />
                            </linearGradient>

                            <filter id="neonGlow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1200" height="1000">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur3" />
                                <feMerge>
                                    <feMergeNode in="blur3" />
                                    <feMergeNode in="blur2" />
                                    <feMergeNode in="blur1" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Pistas Fantasmas (Fundo com 15% de opacidade) */}
                        <path d="M 580 345 L 220 345.01" stroke="#00d2ff" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.15" />
                        <path d="M 220 320 L 330 180 L 440 300 L 580 140" stroke="url(#neonGradientGraph)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.15" />

                        {/* Feixes de Luz Animados */}
                        <path className="logo-base-line" d="M 580 345 L 220 345.01" stroke="#00d2ff" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#neonGlow)" pathLength="100" />
                        <path className="logo-graph-line" d="M 220 320 L 330 180 L 440 300 L 580 140" stroke="url(#neonGradientGraph)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonGlow)" pathLength="100" />
                    </svg>
                </div>
            )}

            {/* O Texto em HTML (aparece apenas quando o menu estiver aberto) */}
            {!collapsed && (
                <div className="logo-text flex items-center whitespace-nowrap overflow-visible -ml-4">
                    <span className="text-sidebar-foreground font-extrabold text-[22px] tracking-tight whitespace-nowrap font-sans">
                        <span className="font-medium opacity-90">vou</span><span className="text-primary">Revisar</span>
                    </span>
                </div>
            )}
        </div>
    );
}
