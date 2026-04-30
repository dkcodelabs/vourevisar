import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: React.ReactNode | ((props: { listeners: any; attributes: any }) => React.ReactNode);
}

export const SortableItem = ({ id, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // CSS.Translate.toString aplica apenas translação (x, y) sem escala,
  // evitando a deformação quando o item passa por cima de cards de alturas diferentes.
  // Zeramos o `x` para restringir o arraste ao eixo vertical exclusivamente.
  const style = {
    transform: CSS.Translate.toString(
      transform ? { ...transform, x: 0 } : null
    ),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
