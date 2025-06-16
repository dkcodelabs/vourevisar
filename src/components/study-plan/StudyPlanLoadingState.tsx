
import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const StudyPlanLoadingState = () => {
  return (
    <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
};

export default StudyPlanLoadingState;
