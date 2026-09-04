import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
    collapsed?: boolean;
    className?: string;
    onClick?: () => void;
}

export function AnimatedLogo({ collapsed = false, className = '', onClick }: AnimatedLogoProps) {
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
        <button
            type="button"
            className={cn(
                "relative inline-flex min-w-0 items-center overflow-visible rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                className
            )}
            onClick={handleReplay}
            aria-label={onClick ? "Abrir vouRevisar" : "Reproduzir animação da marca vouRevisar"}
            title={onClick ? "vouRevisar" : "Reproduzir animação da marca"}
        >
            <BrandLogo
                collapsed={collapsed}
                motion={animationState === 'animating' ? 'entrance' : 'static'}
                className="text-inherit"
            />
        </button>
    );
}
