import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style>{`
        [data-sonner-toaster] {
          --width: 360px;
          --front-layer: 1000;
          --normal-bg: hsl(var(--background));
          --normal-border: hsl(var(--border));
          --normal-text: hsl(var(--foreground));
        }
        
        [data-sonner-toast] {
          border-radius: 12px !important;
          border: 1px solid hsl(var(--border)) !important;
          box-shadow: 0 4px 12px hsl(var(--shadow) / 0.15) !important;
          backdrop-filter: blur(12px) !important;
          margin-bottom: 8px !important;
          position: relative !important;
          transform: translateY(0) !important;
        }
        
        [data-sonner-toaster][data-stacked="true"] [data-sonner-toast] {
          transform: translateY(0) !important;
          margin-bottom: 8px !important;
        }
        
        [data-sonner-toast][data-type="success"] {
          background: hsl(var(--background)) !important;
          border-color: hsl(142 76% 36%) !important;
          color: hsl(var(--foreground)) !important;
        }
        
        [data-sonner-toast][data-type="success"] [data-icon] {
          color: hsl(142 76% 36%) !important;
        }
        
        [data-sonner-toast][data-type="error"] {
          background: hsl(var(--background)) !important;
          border-color: hsl(0 84% 60%) !important;
          color: hsl(var(--foreground)) !important;
        }
        
        [data-sonner-toast][data-type="error"] [data-icon] {
          color: hsl(0 84% 60%) !important;
        }
        
        [data-sonner-toast][data-type="warning"] {
          background: hsl(var(--background)) !important;
          border-color: hsl(38 92% 50%) !important;
          color: hsl(var(--foreground)) !important;
        }
        
        [data-sonner-toast][data-type="warning"] [data-icon] {
          color: hsl(38 92% 50%) !important;
        }
        
        [data-sonner-toast][data-type="info"] {
          background: hsl(var(--background)) !important;
          border-color: hsl(221 83% 53%) !important;
          color: hsl(var(--foreground)) !important;
        }
        
        [data-sonner-toast][data-type="info"] [data-icon] {
          color: hsl(221 83% 53%) !important;
        }
        
        [data-sonner-toast] [data-close-button] {
          background: hsl(var(--muted)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--muted-foreground)) !important;
          border-radius: 8px !important;
          width: 20px !important;
          height: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          z-index: 1001 !important;
        }
        
        [data-sonner-toast] [data-close-button]:hover {
          background: hsl(0 84% 60%) !important;
          color: white !important;
          border-color: hsl(0 84% 60%) !important;
        }
        
        [data-sonner-toast] [data-title] {
          font-weight: 600 !important;
          font-size: 14px !important;
        }
        
        [data-sonner-toast] [data-description] {
          font-size: 13px !important;
          opacity: 0.8 !important;
        }
        
        /* Garantir que os toasts não se sobreponham */
        [data-sonner-toaster] [data-sonner-toast]:nth-child(1) {
          z-index: 1003 !important;
        }
        
        [data-sonner-toaster] [data-sonner-toast]:nth-child(2) {
          z-index: 1002 !important;
        }
        
        [data-sonner-toaster] [data-sonner-toast]:nth-child(3) {
          z-index: 1001 !important;
        }
        
        /* Animações suaves */
        [data-sonner-toast] {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        [data-sonner-toast][data-mounted="true"] {
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        [data-sonner-toast][data-removed="true"] {
          animation: slideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%) !important;
            opacity: 0 !important;
          }
          to {
            transform: translateX(0) !important;
            opacity: 1 !important;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0) !important;
            opacity: 1 !important;
          }
          to {
            transform: translateX(100%) !important;
            opacity: 0 !important;
          }
        }
        
        @media (max-width: 640px) {
          [data-sonner-toaster] {
            --width: calc(100vw - 32px);
            left: 16px !important;
            right: 16px !important;
            bottom: 16px !important;
            top: auto !important;
            position: fixed !important;
          }
          [data-sonner-toaster][data-position="bottom-right"] {
            bottom: 16px !important;
            left: 16px !important;
            right: 16px !important;
          }
        }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="bottom-right"
        closeButton
        richColors
        duration={4000}
        visibleToasts={3}
        pauseWhenPageIsHidden={false}
        expand={false}
        gap={8}
        offset={16}
        hotkey={[]}
        invert={false}
        toastOptions={{
          duration: 4000,
          style: {
            pointerEvents: 'auto'
          },
          classNames: {
            toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
        {...props}
      />
    </>
  )
}

export { Toaster, toast }
