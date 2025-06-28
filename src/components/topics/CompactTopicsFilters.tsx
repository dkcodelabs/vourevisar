
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Search, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';

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
  const { subjects } = useApp();

  // Criar lista de opções dos tópicos existentes
  const topicOptions = subjects.flatMap(subject => 
    subject.topics.map(topic => ({
      value: topic.name,
      label: `${topic.name} (${subject.name})`
    }))
  );

  const handleTopicSelect = (value: string) => {
    // Se selecionou um tópico da lista, usar apenas o nome do tópico
    const selectedTopic = topicOptions.find(option => option.value === value);
    if (selectedTopic) {
      onSearchChange(selectedTopic.value);
    }
  };

  const handleCustomInput = (input: string) => {
    // Quando digita um nome personalizado
    onSearchChange(input);
  };

  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-4 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-6">
          <Combobox
            options={topicOptions}
            value={searchTerm}
            onValueChange={handleTopicSelect}
            placeholder="Pesquisar ou selecionar tópico..."
            searchPlaceholder="Digite para pesquisar..."
            emptyText="Nenhum tópico encontrado"
            className="bg-white/70 border-white/30 h-10"
            allowCustomInput={true}
            onCustomInput={handleCustomInput}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="md:col-span-3">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="bg-white/70 border-white/30 h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="delayed">Atrasados</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="upcoming">Próximos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="bg-white/70 border-white/30 h-10">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data de Revisão</SelectItem>
              <SelectItem value="subject">Matéria</SelectItem>
              <SelectItem value="name">Nome do Tópico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default CompactTopicsFilters;
