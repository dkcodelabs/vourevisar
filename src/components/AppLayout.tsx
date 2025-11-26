
import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';

export const AppLayout = () => {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="fixed top-0 left-0 right-0 z-50 transition-colors duration-200">
        <TopHeader />
      </div>

      <main className="pt-20 container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <style>
        {`
          /* Evitar transições indesejadas no layout */
          * {
            -webkit-backface-visibility: hidden;
            -moz-backface-visibility: hidden;
            -ms-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          /* Garantir que o header seja realmente fixo */
          header {
            will-change: auto;
            transform: translateZ(0);
          }
          
          /* Evitar flash durante navegação */
          main {
            will-change: auto;
            transform: translateZ(0);
          }
          
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
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .calendar-day:hover {
            background-color: #f1f5f9;
          }
          
          .calendar-day-with-revision {
            background-color: #1EAEDB;
            color: white;
            font-weight: 500;
          }
          
          .calendar-day-with-revision:hover {
            background-color: #0FA0CE;
          }
          
          .calendar-day-today {
            border: 2px solid #0FA0CE;
            font-weight: bold;
            background-color: #e6f7ff;
            color: #0FA0CE;
          }
          
          .status-badge {
            padding: 4px 12px;
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
    </div>
  );
};
