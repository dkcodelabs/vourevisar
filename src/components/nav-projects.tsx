import { type LucideIcon, ChevronRight } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavProjects({
  label = "Projects",
  projects,
}: {
  label?: string
  projects: {
    name: string
    url: string
    icon: LucideIcon
    status?: "ok" | "error" | "idle" | "unread"
  }[]
}) {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {projects.map((item) => {
          const isActive = location.pathname.startsWith(item.url)

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                <NavLink to={item.url} onClick={closeMobileSidebar} className="flex items-center gap-3.5 w-full">
                  <item.icon className="size-5 shrink-0 transition-transform duration-150" />
                  <span
                    className={cn(
                      "text-[13px] leading-none tracking-tight flex-1 transition-colors",
                      isActive ? "font-bold text-blue-600 dark:text-white" : "font-medium text-inherit"
                    )}
                  >
                    {item.name}
                  </span>
                  {isActive && !item.status && <ChevronRight className="size-3.5 text-blue-600 dark:text-white/80 shrink-0 ml-auto" />}
                  {item.status && (
                    <span
                      className={[
                        "ml-auto size-1.5 rounded-full group-data-[collapsible=icon]:hidden",
                        item.status === "ok" && "bg-emerald-500",
                        item.status === "error" && "bg-red-500",
                        item.status === "idle" && "bg-muted-foreground/50",
                        item.status === "unread" && "bg-blue-500",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label={item.status === "unread" ? "Há atualizações não lidas" : undefined}
                    />
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
