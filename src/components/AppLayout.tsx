
import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-surface-50 via-background to-surface-100 dark:from-surface-950 dark:via-background dark:to-surface-900">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-200/10 dark:bg-brand-800/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-300/10 dark:bg-brand-700/10 rounded-full blur-3xl" />
        </div>
        
        <AppSidebar />
        
        <SidebarInset className="flex-1 relative">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-xl md:hidden safe-top">
            <motion.span 
              className="text-brand-600 dark:text-brand-400 font-bold text-2xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              vouRevisar
            </motion.span>
            <SidebarTrigger className="touch-target" />
          </header>
          
          {/* Main Content */}
          <motion.main 
            className="p-6 md:p-8 safe-area-inset"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet />
          </motion.main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
