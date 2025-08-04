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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="cursor-grab active:cursor-grabbing"
    >
      {typeof children === 'function'
        ? (children as (props: { listeners: any; attributes: any }) => React.ReactNode)({ listeners, attributes })
        : children}
    </div>
  );
};
