
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReviewsFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  setViewMode: (mode: 'all' | 'date') => void;
  resetFilters: () => void;
}

export const ReviewsFilters: React.FC<ReviewsFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  setViewMode,
  resetFilters
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-80">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Pesquisar tópicos ou disciplinas..."
          className="pl-9 text-sm h-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="text-sm h-9">
              <Calendar className="h-4 w-4 mr-2" />
              {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Filtrar por data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setViewMode(date ? 'date' : 'all');
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        {(selectedDate || searchTerm) && (
          <Button variant="outline" onClick={resetFilters} className="text-sm h-9">
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );
};
