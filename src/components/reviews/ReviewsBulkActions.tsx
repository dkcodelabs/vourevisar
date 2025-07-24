import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Maximize2, Minimize2 } from 'lucide-react';

interface ReviewsBulkActionsProps {
  totalCount: number;
  onShowStatistics: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  allExpanded: boolean;
  tab: 'hoje' | 'futuras' | 'concluido';
}

export const ReviewsBulkActions: React.FC<ReviewsBulkActionsProps> = ({
  totalCount,
  onShowStatistics,
  onExpandAll,
  onCollapseAll,
  allExpanded,
  tab
}) => {
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 border rounded-lg">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="text-sm text-gray-700">
          {totalCount} {totalCount === 1 ? 'tópico' : 'tópicos'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={allExpanded ? onCollapseAll : onExpandAll}
        >
          {allExpanded ? (
            <>
              <Minimize2 className="h-4 w-4 mr-1" />
              Minimizar Todos
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 mr-1" />
              Expandir Todos
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShowStatistics}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Estatísticas
        </Button>
      </div>
    </div>
  );
};