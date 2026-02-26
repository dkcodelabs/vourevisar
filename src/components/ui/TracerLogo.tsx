import React from 'react';
import { cn } from "@/lib/utils";

interface TracerLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export const TracerLogo = ({ className, ...props }: TracerLogoProps) => {
    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <style>{`
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
                .logo-text {
                    opacity: 0;
                    transform: translateY(15px);
                    animation: fadeUpText 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    animation-delay: 2.5s; 
                }
                @keyframes drawLine {
                    0% { stroke-dashoffset: 100; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes drawGraph {
                    0%, 39.9% { stroke-dashoffset: 105; opacity: 0; }
                    40% { stroke-dashoffset: 105; opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 1; }
                }
                @keyframes fadeUpText {
                    0% { opacity: 0; transform: translateY(15px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="150 100 500 350"
                className="w-full h-full"
                {...props}
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

                {/* Linha Horizontal (Azul Neon) */}
                <path className="base-line"
                    d="M 580 345 L 220 345.01"
                    stroke="#00d2ff"
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                    pathLength="100"
                    filter="url(#neonGlow)" />

                {/* Linha do Gráfico */}
                <path className="graph-line"
                    d="M 220 320 L 330 180 L 440 300 L 580 140"
                    stroke="url(#neonGradientGraph)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    pathLength="100"
                    filter="url(#neonGlow)" />

                {/* Texto da Marca */}
                <g className="logo-text">
                    <text x="400" y="420" fontSize="64" fill="currentColor" className="text-foreground" textAnchor="middle" letterSpacing="-1.5" fontFamily="Inter, system-ui, sans-serif">
                        <tspan fontWeight="400">vou</tspan><tspan fontWeight="700">Revisar</tspan>
                    </text>
                </g>
            </svg>
        </div>
    );
};
