import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style>{`
        [data-sonner-toaster] [data-sonner-toast] {
          transform: none !important;
          scale: 1 !important;
        }
        [data-sonner-toaster] [data-sonner-toast]:hover {
          transform: none !important;
          scale: 1 !important;
        }
        [data-sonner-toaster] button[data-close-button] {
          pointer-events: auto !important;
          z-index: 1001 !important;
          position: relative !important;
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
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton:
              "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            closeButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600 group-[.toast]:border group-[.toast]:border-gray-200 hover:group-[.toast]:bg-red-500 hover:group-[.toast]:text-white hover:group-[.toast]:border-red-500 transition-colors duration-200 cursor-pointer",
          },
        }}
        {...props}
      />
    </>
  )
}

export { Toaster, toast }
