import React, { useRef, useEffect } from 'react';

interface AnimatedLogoProps {
    collapsed?: boolean;
    className?: string;
    onClick?: () => void;
}

export function AnimatedLogo({ collapsed = false, className = '', onClick }: AnimatedLogoProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const replayAnimations = () => {
        const container = containerRef.current;
        if (!container) return;

        const baseLine = container.querySelector('.base-line') as SVGPathElement;
        const graphLine = container.querySelector('.graph-line') as SVGPathElement;

        // We only animate the SVG icon
        if (baseLine) {
            baseLine.style.animation = 'none';
            void baseLine.getBoundingClientRect();
            baseLine.style.animation = '';
        }

        if (graphLine) {
            graphLine.style.animation = 'none';
            void graphLine.getBoundingClientRect();
            graphLine.style.animation = '';
        }

        // The text is an HTML element that animates on mount via CSS
    };

    const handleReplay = (e: React.MouseEvent) => {
        if (onClick) onClick();
        replayAnimations();
    };

    // Replay animations on mount (with delay for animated containers like mobile drawer)
    // and whenever the sidebar expands (collapsed -> false)
    useEffect(() => {
        const timer = setTimeout(() => {
            replayAnimations();
        }, 100);
        return () => clearTimeout(timer);
    }, [collapsed]);

    return (
        <div
            ref={containerRef}
            className={`relative cursor-pointer flex items-center gap-2 overflow-hidden ${className}`}
            onClick={handleReplay}
            title="Clique para reiniciar a animação"
        >
            <style>
                {`
        .base-line {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: drawLine 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .graph-line {
            stroke-dasharray: 105; 
            stroke-dashoffset: 105;
            opacity: 0; 
            animation: drawGraph 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-fade-up-text {
            opacity: 0;
            transform: translateY(15px);
            animation: fadeUpText 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            animation-delay: 0s; /* Appears immediately with the graph */
        }
        @keyframes drawLine {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
        }
        @keyframes drawGraph {
            0%, 39.9% { 
                stroke-dashoffset: 105; 
                opacity: 0; 
            }
            40% { 
                stroke-dashoffset: 105; 
                opacity: 1; 
            }
            100% { 
                stroke-dashoffset: 0; 
                opacity: 1; 
            }
        }
        @keyframes fadeUpText {
            0% { opacity: 0; transform: translateY(15px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        `}
            </style>

            {/* O ícone SVG (Tamanho Fixo) */}
            <div className="w-14 h-9 shrink-0 flex items-center justify-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 400 250"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <linearGradient id="neonGradientGraph" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ff7b00" />
                            <stop offset="50%" stopColor="#ffea00" />
                            <stop offset="100%" stopColor="#00ff87" />
                        </linearGradient>

                        <filter id="neonGlow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1000">
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

                    <path className="base-line"
                        d="M 380 225 L 20 225.01"
                        stroke="#00d2ff"
                        strokeWidth="24"
                        strokeLinecap="round"
                        fill="none"
                        pathLength="100"
                        filter="url(#neonGlow)" />

                    <path className="graph-line"
                        d="M 20 180 L 130 50 L 240 160 L 380 20"
                        stroke="url(#neonGradientGraph)"
                        strokeWidth="24"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        pathLength="100"
                        filter="url(#neonGlow)" />
                </svg>
            </div>

            {/* O Texto em HTML (aparece apenas quando o menu estive aberto) */}
            {!collapsed && (
                <div className="animate-fade-up-text flex items-center whitespace-nowrap overflow-visible">
                    <span className="text-sidebar-foreground font-extrabold text-[20px] tracking-tight whitespace-nowrap font-sans">
                        <span className="font-medium opacity-90">vou</span><span className="text-primary">Revisar</span>
                    </span>
                </div>
            )}
        </div>
    );
}
