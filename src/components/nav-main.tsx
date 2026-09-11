"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  label = "Platform",
  items,
}: {
  label?: string
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
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
        {items.map((item) => {
          const isActive =
            item.url === "/dashboard"
              ? location.pathname === item.url
              : location.pathname.startsWith(item.url)
          const defaultOpen = item.isActive || isActive

          return (
            <Collapsible key={item.title} asChild defaultOpen={defaultOpen}>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                  <NavLink to={item.url} onClick={closeMobileSidebar} className="flex items-center gap-3.5 w-full">
                    <item.icon className="size-5 shrink-0 transition-transform duration-150" />
                    <span
                      className={cn(
                        "text-[13px] leading-none tracking-tight flex-1 transition-colors",
                        isActive ? "font-bold text-blue-600 dark:text-white" : "font-medium text-inherit"
                      )}
                    >
                      {item.title}
                    </span>
                    {isActive && <ChevronRight className="size-3.5 text-blue-600 dark:text-white/80 shrink-0 ml-auto" />}
                  </NavLink>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Alternar submenu</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive = location.pathname === subItem.url
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isSubActive}>
                                <NavLink to={subItem.url} onClick={closeMobileSidebar}>
                                  <span
                                    className={cn(
                                      "text-[12px] leading-none tracking-tight flex-1 transition-colors",
                                      isSubActive ? "font-bold text-blue-600 dark:text-white" : "font-medium"
                                    )}
                                  >
                                    {subItem.title}
                                  </span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
