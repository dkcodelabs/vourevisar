import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePiPTimerProps {
    displayTime: string;
    isActive: boolean;
}

/**
 * Detecta se o PiP padrão do HTML5 é suportado.
 * 
 * O Safari possui uma implementação instável para \`canvas.captureStream()\` 
 * no Picture-in-Picture. Por solicitação do usuário, não usaremos hacks ou overlays CSS 
 * para contornar isso. O recurso ficará desabilitado nativamente no Safari até que a Apple 
 * implemente o \`document.pictureInPictureEnabled\` de forma estável para canvas.
 */
function isPiPSupported(): boolean {
    if (typeof document === 'undefined' || typeof window === 'undefined') return false;
    if (window.innerWidth <= 768) return false; // Mobile: sem PiP

    // API padrão: Chrome, Edge, Firefox
    if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
        return true;
    }

    // Safari não suporta pictureInPictureEnabled de forma confiável para canvas stream.
    // O recurso será simplesmente ocultado.
    return false;
}

export const usePiPTimer = ({ displayTime, isActive }: UsePiPTimerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        setIsSupported(isPiPSupported());
    }, []);

    // Desenha no canvas
    useEffect(() => {
        if (!isSupported) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 600;
        canvas.height = 150;

        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 600, 150);

        ctx.font = 'bold 80px Inter, system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isActive ? displayTime : 'Focus', 300, 75);

        if (isActive) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.font = '22px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('⤡', 8, 8);
        }

        // Cria stream apenas uma vez
        if (video.srcObject === null) {
            const stream = canvas.captureStream(1);
            video.srcObject = stream;
            video.play().catch(() => { });
        }
    }, [displayTime, isActive, isSupported]);

    const togglePiP = useCallback(() => {
        if (!isSupported) return;

        const openStandardPiP = async () => {
            const video = videoRef.current;
            if (!video) return;
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    if (video.paused) await video.play();
                    await video.requestPictureInPicture();
                }
            } catch (error) {
                console.error('[PiP] Falha ao alternar Picture-in-Picture:', error);
            }
        };

        openStandardPiP();
    }, [isSupported]);

    return {
        canvasRef,
        videoRef,
        togglePiP,
        isSupported
    };
};
