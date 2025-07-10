
import React from 'react';
import { PageTitle } from '@/components/PageTitle';
import StudyPlanContent from '@/components/study-plan/StudyPlanContent';

const StudyPlan = () => {
  return (
    <div className="p-4">
      <PageTitle title="Plano de Estudos" subtitle="Organize seus estudos diários" />
      <StudyPlanContent />
    </div>
  );
};

export default StudyPlan;
