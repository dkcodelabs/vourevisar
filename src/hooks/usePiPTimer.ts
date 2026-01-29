import { useEffect, useRef, useState } from 'react';

interface UsePiPTimerProps {
    minutes: number;
    isActive: boolean;
}

export const usePiPTimer = ({ minutes, isActive }: UsePiPTimerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check support
        if (
            typeof document !== 'undefined' &&
            'pictureInPictureEnabled' in document &&
            window.innerWidth > 768
        ) {
            setIsSupported(true);
        } else {
            setIsSupported(false);
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Visual Specifications
        // Dimensions: 600x150 (Physical) - Banner Aspect Ratio 4:1
        canvas.width = 600;
        canvas.height = 150;

        // High DPI Scale: 2x (Logical viewport: 300x75)
        ctx.scale(2, 2);

        // Background: Indigo Deep (#1e1b4b)
        // Draw in logical coordinates (0,0 to 300,75)
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 300, 75);

        // Typography
        // Logical font size 40px renders as 80px physical pixels (Sharp/Retina)
        ctx.font = 'bold 40px Inter, system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text Content
        const text = isActive ? `${minutes} min` : 'Focus';

        // Center Logic: Logical Width / 2, Logical Height / 2
        ctx.fillText(text, 150, 37.5);

        // Resize Handle (Visual Hint)
        if (isActive) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.font = '14px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('⤡', 5, 5);
        }

        // Stream Management
        if (video.srcObject === null) {
            const stream = canvas.captureStream();
            video.srcObject = stream;
            // Ensure video plays to allow PiP
            video.play().catch(() => { /* Silent catch for autoplay restrictions */ });
        }

    }, [minutes, isActive]);

    const togglePiP = async () => {
        if (!videoRef.current || !isSupported) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Failed to toggle PiP:', error);
        }
    };

    return {
        canvasRef,
        videoRef,
        togglePiP,
        isSupported
    };
};
