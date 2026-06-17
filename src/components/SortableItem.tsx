import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  lockAxis?: 'vertical' | 'free';
  disabled?: boolean;
  children: React.ReactNode | ((props: { listeners: any; attributes: any }) => React.ReactNode);
}

export const SortableItem = ({ id, lockAxis = 'vertical', disabled = false, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  // CSS.Translate.toString aplica apenas translação (x, y) sem escala,
  // evitando a deformação quando o item passa por cima de cards de alturas diferentes.
  // Zeramos o `x` para restringir o arraste ao eixo vertical exclusivamente.
  const translatedTransform = transform && lockAxis === 'vertical'
    ? { ...transform, x: 0 }
    : transform;

  const style = {
    transform: CSS.Translate.toString(translatedTransform),
    transition,
    opacity: isDragging ? 0.96 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
    >
      {typeof children === 'function'
        ? (children as (props: { listeners: any; attributes: any }) => React.ReactNode)({ listeners, attributes })
        : children}
    </div>
  );
};
