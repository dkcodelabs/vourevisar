import React, { useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
    collapsed?: boolean;
    className?: string;
    onClick?: () => void;
    isRepeating?: boolean;
}

export function AnimatedLogo({ collapsed = false, className = '', onClick, isRepeating = false }: AnimatedLogoProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const replayAnimations = () => {
        const container = containerRef.current;
        if (!container) return;

        const baseLine = container.querySelector('.base-line-tracer') as SVGPathElement;
        const graphLine = container.querySelector('.graph-line-tracer') as SVGPathElement;

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

        const textContainer = container.querySelector('.text-container-loader') as HTMLDivElement;
        if (textContainer) {
            textContainer.style.animation = 'none';
            void textContainer.getBoundingClientRect();
            textContainer.style.animation = '';
        }
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
            className={cn(`relative cursor-pointer flex items-center gap-2 overflow-hidden`, className)}
            onClick={handleReplay}
            title="Clique para reiniciar a animação"
        >
            <style>
                {`
        .base-line-tracer {
            stroke-dasharray: ${isRepeating ? '0 1000' : '100'};
            stroke-dashoffset: ${isRepeating ? '200' : '100'};
            opacity: 0;
            animation: ${isRepeating ? 'realisticTracer 3s infinite cubic-bezier(0.4, 0, 0.2, 1)' : 'drawLine 1s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
            animation-delay: ${isRepeating ? '0s' : '0.8s'};
        }
        .graph-line-tracer {
            stroke-dasharray: ${isRepeating ? '0 1000' : '105'};
            stroke-dashoffset: ${isRepeating ? '200' : '105'};
            opacity: 0;
            animation: ${isRepeating ? 'realisticTracer 3s infinite cubic-bezier(0.4, 0, 0.2, 1)' : 'drawGraph 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
            animation-delay: ${isRepeating ? '1.5s' : '0.8s'};
        }
        
        /* Combinação de entrada e pulso para quando está repetindo */
        .text-container-loader {
            ${isRepeating
                        ? 'opacity: 1; transform: translateY(0); animation: pulseText 3s ease-in-out infinite;'
                        : 'opacity: 0; transform: translateY(15px); animation: fadeUpText 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; animation-delay: 0s;'}
        }

        /* KEYFRAMES BLINDADOS CONTRA PISCAR (FLICKER-FREE) - LOADER */
        @keyframes realisticTracer {
            0%, 0.99% {
                stroke-dasharray: 0 1000;
                stroke-dashoffset: 200; 
                opacity: 0;
            }
            1% {
                stroke-dasharray: 0 1000;
                stroke-dashoffset: 0;
                opacity: 1;
            }
            30% {
                stroke-dasharray: 50 1000;
                stroke-dashoffset: 0;
                opacity: 1;
            }
            59% {
                stroke-dasharray: 0 1000;
                stroke-dashoffset: -100;
                opacity: 1;
            }
            59.01%, 100% {
                stroke-dasharray: 0 1000;
                stroke-dashoffset: -200;
                opacity: 0;
            }
        }

        /* KEYFRAMES DE ENTRADA UNICA (1x) */
        @keyframes drawLine {
            0% { stroke-dashoffset: 100; opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes drawGraph {
            0%, 39.9% { 
                stroke-dashoffset: 105; 
                opacity: 0; 
            }
            40% { /* Momento exato que a linha azul termina */
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

        @keyframes pulseText {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }
        `}
            </style>

            {/* O ícone SVG (Só exibe se o sidebar NÃO estiver collapsed) */}
            {!collapsed && (
                <div className="w-[84px] h-[52px] shrink-0 flex items-center justify-center -ml-1">
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
                        <path className="base-line-tracer" d="M 580 345 L 220 345.01" stroke="#00d2ff" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#neonGlow)" pathLength="100" />
                        <path className="graph-line-tracer" d="M 220 320 L 330 180 L 440 300 L 580 140" stroke="url(#neonGradientGraph)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonGlow)" pathLength="100" />
                    </svg>
                </div>
            )}

            {/* O Texto em HTML (aparece apenas quando o menu estive aberto) */}
            {!collapsed && (
                <div className="text-container-loader flex items-center whitespace-nowrap overflow-visible -ml-4">
                    <span className="text-sidebar-foreground font-extrabold text-[22px] tracking-tight whitespace-nowrap font-sans">
                        <span className="font-medium opacity-90">vou</span><span className="text-primary">Revisar</span>
                    </span>
                </div>
            )}
        </div>
    );
}
