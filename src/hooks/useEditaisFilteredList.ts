import { useEffect, useMemo } from 'react';

import { compareEditaisByCreatedOrder } from '@/utils/editalOrder';
import type { UserEdital } from '@/utils/editaisPagePresentation';

type UseEditaisFilteredListInput = {
  editais: UserEdital[];
  filterCycle: boolean;
  highlightedSourceId: string | null;
  scrolledTo: boolean;
  setScrolledTo: (value: boolean) => void;
};

export function useEditaisFilteredList({ editais, filterCycle, highlightedSourceId, scrolledTo, setScrolledTo }: UseEditaisFilteredListInput) {
  const filteredEditais = useMemo(() => {
    const result = filterCycle ? editais.filter(edital => edital.mergedIntoCycle) : editais;
    return [...result].sort(compareEditaisByCreatedOrder);
  }, [editais, filterCycle]);

  useEffect(() => {
    if (!highlightedSourceId || filteredEditais.length === 0 || scrolledTo) return;
    const timer = window.setTimeout(() => {
      const targetEdital = filteredEditais.find(edital => edital.sourceId === highlightedSourceId || edital.id === highlightedSourceId);
      const element = targetEdital ? document.getElementById(`edital-${targetEdital.id}`) : null;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setScrolledTo(true);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [filteredEditais, highlightedSourceId, scrolledTo, setScrolledTo]);

  return filteredEditais;
}
