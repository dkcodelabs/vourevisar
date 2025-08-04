
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar, Filter } from 'lucide-react';
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <Input
          type="text"
          placeholder="Pesquisar tópicos ou disciplinas..."
          className="pl-10 w-full sm:w-80 text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="text-sm border-slate-300 hover:bg-slate-50 bg-white px-4 py-2 h-10 whitespace-nowrap"
          >
            <Filter className="h-4 w-4 mr-2" />
            {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Filtrar por data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-lg" align="end">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setViewMode(date ? 'date' : 'all');
            }}
            initialFocus
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
