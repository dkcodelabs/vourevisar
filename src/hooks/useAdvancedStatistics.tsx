import { useRealStatistics, RealStatisticsData } from './useRealStatistics';

export type StatisticsData = RealStatisticsData;

export const useAdvancedStatistics = (): StatisticsData => {
  return useRealStatistics();
};