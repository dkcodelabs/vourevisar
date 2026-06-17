import { type LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavProjects({
  label = "Projects",
  projects,
}: {
  label?: string
  projects: {
    name: string
    url: string
    icon: LucideIcon
    status?: "ok" | "error" | "idle"
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
                <NavLink to={item.url} onClick={closeMobileSidebar}>
                  <item.icon />
                  <span>{item.name}</span>
                  {item.status && (
                    <span
                      className={[
                        "ml-auto size-1.5 rounded-full group-data-[collapsible=icon]:hidden",
                        item.status === "ok" && "bg-emerald-500",
                        item.status === "error" && "bg-red-500",
                        item.status === "idle" && "bg-muted-foreground/50",
                      ]
                        .filter(Boolean)
                        .join(" ")}
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
