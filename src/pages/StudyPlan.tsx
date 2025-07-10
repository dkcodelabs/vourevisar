
import React from 'react';
import StudyPlanMainView from '@/components/study-plan/StudyPlanMainView';
import { PageTitle } from '@/components/PageTitle';

const StudyPlan = () => {

  return (
    <div className="p-6">
      <PageTitle title="Plano de Estudos" subtitle="Organize seus estudos diários" />
      <StudyPlanMainView />
    </div>
  );
};

export default StudyPlan;
