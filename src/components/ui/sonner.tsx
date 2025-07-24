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
        }
        
        [data-sonner-toast] {
          border-radius: 12px !important;
          border: 1px solid hsl(var(--border)) !important;
          box-shadow: 0 4px 12px hsl(var(--shadow) / 0.15) !important;
          backdrop-filter: blur(12px) !important;
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
        
        @media (max-width: 640px) {
          [data-sonner-toaster] {
            --width: calc(100vw - 32px);
            left: 16px !important;
            right: 16px !important;
            top: 16px !important;
            bottom: auto !important;
            position: fixed !important;
          }
          [data-sonner-toaster][data-position="top-right"] {
            top: 16px !important;
            left: 16px !important;
            right: 16px !important;
          }
        }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="top-right"
        closeButton
        richColors
        duration={4000}
        visibleToasts={4}
        pauseWhenPageIsHidden={false}
        expand={true}
        gap={12}
        offset={16}
        hotkey={[]}
        invert={false}
        toastOptions={{
          duration: 4000,
          style: {
            pointerEvents: 'auto'
          },
        }}
        {...props}
      />
    </>
  )
}

export { Toaster, toast }
