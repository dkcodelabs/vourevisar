import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: 'xs' | 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal';
  showText?: boolean;
  message?: string;
}

export const LoadingSpinner = ({
  className,
  size = 'medium',
  variant = 'default',
  showText = false,
  message
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    xs: "w-16 h-10",
    small: "w-24 h-16",
    medium: "w-40 h-28",
    large: "w-64 h-48"
  };

  const displayMessage = message || (showText ? "Carregando..." : null);

  return (
    <div className={cn("flex flex-col justify-center items-center gap-2", className)}>
      <style>{`
        /* CONFIGURAÇÃO INICIAL */
        .base-line-tracer {
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 200;
            opacity: 0;
            animation: realisticTracer 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .graph-line-tracer {
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 200;
            opacity: 0;
            animation: realisticTracer 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            animation-delay: 1.5s; /* Sobreposição perfeita (overlap) */
        }

        .logo-text-pulse {
            animation: pulseText 3s ease-in-out infinite;
        }

        /* KEYFRAMES BLINDADOS CONTRA PISCAR (FLICKER-FREE) */
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

        @keyframes pulseText {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }
      `}</style>

      <div className={cn("relative flex items-center justify-center pointer-events-none drop-shadow-xl overflow-hidden", sizeClasses[size])}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="150 100 500 350" className="w-full h-full overflow-hidden">
          <defs>
            {/* Cores do Gráfico Unificadas para o Loader */}
            <linearGradient id="loaderGradientGraph" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff7b00" />
              <stop offset="50%" stopColor="#ffea00" />
              <stop offset="100%" stopColor="#00ff87" />
            </linearGradient>

            {/* Filtro de Brilho Neon Único para o Loader para evitar conflitos com TracerLogo */}
            <filter id="loaderGlow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1200" height="1000">
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
          <path d="M 220 320 L 330 180 L 440 300 L 580 140" stroke="url(#loaderGradientGraph)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.15" />

          {/* Feixes de Luz Animados com IDs únicos */}
          <path className="base-line-tracer" d="M 580 345 L 220 345.01" stroke="#00d2ff" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#loaderGlow)" pathLength="100" />
          <path className="graph-line-tracer" d="M 220 320 L 330 180 L 440 300 L 580 140" stroke="url(#loaderGradientGraph)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#loaderGlow)" pathLength="100" />

          {/* Texto Pulsante - Oculto em variant minimal */}
          {variant !== 'minimal' && (
            <g className="logo-text-pulse">
              <text x="400" y="420" fontSize="64" fill="currentColor" className="text-foreground" textAnchor="middle" letterSpacing="-1.5" fontFamily="Inter, system-ui, sans-serif">
                <tspan fontWeight="400">vou</tspan><tspan fontWeight="700">Revisar</tspan>
              </text>
            </g>
          )}
        </svg>
      </div>

      {displayMessage && (
        <p className="text-xs font-bold text-muted-foreground animate-pulse tracking-[0.2em] uppercase mt-2">
          {displayMessage}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner; 