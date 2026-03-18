import { useRealStatistics, RealStatisticsData, StatisticsFilter } from './useRealStatistics';

export type StatisticsData = RealStatisticsData;

export const useAdvancedStatistics = (filter?: StatisticsFilter): StatisticsData => {
  return useRealStatistics(filter);
};