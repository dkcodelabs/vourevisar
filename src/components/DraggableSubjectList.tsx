
import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Subject } from '@/types';
import { Card, CardContent } from '@/components/ui/card';

interface DraggableSubjectListProps {
  subjects: Subject[];
  onReorder: (reorderedSubjects: Subject[]) => void;
  onSubjectClick: (subject: Subject) => void;
}

const DraggableSubjectList: React.FC<DraggableSubjectListProps> = ({
  subjects,
  onReorder,
  onSubjectClick
}) => {
  const handleDragEnd = (result: DropResult) => {
    // Verificar se o item foi solto fora da área de drop
    if (!result.destination) return;
    
    // Verificar se a posição mudou
    if (result.source.index === result.destination.index) return;
    
    // Criar uma cópia da lista de matérias
    const reorderedSubjects = Array.from(subjects);
    
    // Remover o item da posição de origem
    const [removed] = reorderedSubjects.splice(result.source.index, 1);
    
    // Inserir o item na nova posição
    reorderedSubjects.splice(result.destination.index, 0, removed);
    
    // Atualizar as prioridades das matérias
    const updatedSubjects = reorderedSubjects.map((subject, index) => ({
      ...subject,
      priority: index + 1
    }));
    
    // Chamar o callback de reordenação
    onReorder(updatedSubjects);
  };
  
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Nova':
        return 'status-badge status-nova';
      case 'Em Estudo':
        return 'status-badge status-em-estudo';
      case 'Concluída':
        return 'status-badge status-concluida';
      default:
        return 'status-badge status-nova';
    }
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="subjects">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-3"
          >
            {subjects.map((subject, index) => (
              <Draggable key={subject.id} draggableId={subject.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                      style={{ borderLeftColor: subject.color || '#1EAEDB' }}
                      onClick={() => onSubjectClick(subject)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-semibold">{index + 1}.</div>
                            <div>
                              <h3 className="font-medium text-lg">{subject.name}</h3>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className={getStatusBadgeClass(subject.status)}>
                                  {subject.status}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {subject.topics.length} tópicos
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            {snapshot.isDragging ? (
                              <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Movendo...
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                Arraste para reordenar
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {subjects.length === 0 && (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <p className="text-gray-500">
                  Nenhuma matéria cadastrada. Adicione uma nova matéria para começar.
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DraggableSubjectList;
