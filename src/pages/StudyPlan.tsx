import React from 'react';
import StudyPlanMainView from '@/components/studyplan/StudyPlanMainView';
import { PageTitle } from '@/components/PageTitle';

const StudyPlan = () => {

  return (
    <div>
      <PageTitle title="Plano de Estudos" subtitle="Organize seus estudos diários" />
      <StudyPlanMainView />
    </div>
  );
};

export default StudyPlan;
