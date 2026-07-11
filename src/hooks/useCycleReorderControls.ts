import { useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

type UseCycleReorderControlsInput = {
  setCycleExpandedSubjectIds: React.Dispatch<React.SetStateAction<string[]>>;
};

export function useCycleReorderControls({
  setCycleExpandedSubjectIds,
}: UseCycleReorderControlsInput) {
  const [isReorderingCycle, setIsReorderingCycle] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (_event: DragStartEvent) => {
    // Mantém o estado aberto/fechado da fila durante a ordenação.
  };

  const handleToggleCycleReorder = () => {
    setIsReorderingCycle(prev => {
      const next = !prev;
      if (next) {
        setCycleExpandedSubjectIds([]);
      }
      return next;
    });
  };

  return {
    handleDragStart,
    handleToggleCycleReorder,
    isReorderingCycle,
    sensors,
    setIsReorderingCycle,
  };
}
