import React from 'react';

interface CycleStatusIndicatorProps {
  isStudied: boolean;
  isNextSuggested: boolean;
  variant?: 'dot' | 'badge';
  className?: string;
}

export const CycleStatusIndicator: React.FC<CycleStatusIndicatorProps> = ({
  isStudied,
  isNextSuggested,
  variant = 'dot',
  className = ''
}) => {

  
  const getStatusColor = () => {
    if (isStudied) {
      return 'bg-green-500'; // Verde para estudada
    }
    return 'bg-orange-500'; // Laranja para não estudada
  };

  const getStatusClasses = () => {
    const baseClasses = getStatusColor();
    
    if (variant === 'badge') {
      return `${baseClasses} w-3 h-3 rounded-full ${className}`;
    }
    
    // Variant 'dot' - bolinha pequena
    let classes = `${baseClasses} w-2 h-2 rounded-full ${className}`;
    
    // Adicionar animação pulsante se for a próxima sugerida
    if (isNextSuggested && !isStudied) {
      classes += ' animate-pulse ring-2 ring-orange-300 ring-opacity-50';
    }
    
    return classes;
  };

  return (
    <div 
      className={getStatusClasses()} 
      title={`Status: ${isStudied ? 'Estudada' : 'Não estudada'}`}
      style={{
        // Forçar cores via style para garantir que não há conflito de CSS
        backgroundColor: isStudied ? '#10b981' : '#f97316'
      }}
    />
  );
};