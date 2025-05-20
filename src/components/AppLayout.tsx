
import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
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
