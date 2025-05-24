
import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
// Removed Button, MenuIcon, Sheet components, useIsMobile as they are handled by ui/sidebar or not needed here directly

export function AppLayout() {
  // defaultOpen={true} for SidebarProvider means sidebar is expanded on desktop by default.
  // The ui/Sidebar component within AppSidebar will handle its own mobile sheet display.
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar /> {/* This component now uses <Sidebar> from ui/sidebar internally */}
      
      <SidebarInset> {/* Manages the main content area layout correctly with the ui/Sidebar */}
        {/* Header for mobile trigger. md:hidden ensures it's only on small screens. */}
        <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-background md:hidden">
          <span className="text-app-blue font-bold text-2xl">vouRevisar</span>
          <SidebarTrigger /> {/* This trigger is from ui/sidebar and controls the Sheet on mobile */}
        </header>
        
        {/* Main page content */}
        <div className="p-6">
          <Outlet />
          {/* Global styles can remain if they are truly global and not component-specific */}
          <style>
            {`
              .progress-bar {
                width: 100%;
                height: 8px;
                background-color: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 8px;
              }
              
              .progress-bar-fill {
                height: 100%;
                background-color: #1EAEDB;
                border-radius: 4px;
                transition: width 0.5s ease;
              }
              
              .calendar-day {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                border-radius: 4px;
              }
              
              .calendar-day-with-revision {
                background-color: #1EAEDB;
                color: white;
                font-weight: 500;
              }
              
              .calendar-day-today {
                border: 2px solid #0FA0CE;
                font-weight: bold;
                background-color: #e6f7ff;
                color: #0FA0CE;
              }
              
              .status-badge {
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 12px;
                font-weight: 500;
              }
              
              .status-nova {
                background-color: #e2e8f0;
                color: #475569;
              }
              
              .status-em-estudo {
                background-color: #dbeafe;
                color: #1e40af;
              }
              
              .status-concluida {
                background-color: #dcfce7;
                color: #166534;
              }
              `}
            </style>
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
