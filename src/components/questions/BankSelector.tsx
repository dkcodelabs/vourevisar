
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BankSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const BankSelector: React.FC<BankSelectorProps> = ({ value, onChange }) => {
  const bancasDisponiveis = [
    'Todas',
    'CESPE/CEBRASPE',
    'FCC',
    'FGV',
    'VUNESP',
    'ESAF',
    'CESGRANRIO',
    'FUNCAB',
    'IBFC',
    'AOCP',
    'QUADRIX',
    'CONSULPLAN',
    'IDECAN'
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Banca *
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a banca" />
        </SelectTrigger>
        <SelectContent>
          {bancasDisponiveis.map((banca) => (
            <SelectItem key={banca} value={banca}>
              {banca}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BankSelector;
