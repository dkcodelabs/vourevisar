
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface CompactTopicsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

const CompactTopicsFilters: React.FC<CompactTopicsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-4 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar tópicos ou matérias..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white/70 border-white/30 h-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="bg-white/70 border-white/30 h-10">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="delayed">Atrasados</SelectItem>
            <SelectItem value="upcoming">Próximos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="bg-white/70 border-white/30 h-10">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Data de Revisão</SelectItem>
            <SelectItem value="subject">Matéria</SelectItem>
            <SelectItem value="name">Nome do Tópico</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CompactTopicsFilters;
