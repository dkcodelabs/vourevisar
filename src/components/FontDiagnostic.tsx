import React, { useState, useEffect } from 'react';
import { generateDiagnosticReport, useSessionOptimization } from '@/utils/sessionOptimization';

interface DiagnosticReport {
  timestamp: string;
  fontStandardCompliant: boolean;
  renderingIssues: string[];
  totalElements: number;
  elementsWithInlineStyles: number;
  uniqueFontFamilies: string[];
  recommendations: string[];
}

export const FontDiagnostic: React.FC = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Aplica otimizações de sessão
  useSessionOptimization();
  
  const runDiagnostic = () => {
    const diagnosticReport = generateDiagnosticReport();
    setReport(diagnosticReport);
    setIsVisible(true);
    
    // Log removido para otimização
  };
  
  useEffect(() => {
    // Diagnóstico automático desabilitado para otimização
    // if (process.env.NODE_ENV === 'development') {
    //   setTimeout(runDiagnostic, 2000);
    // }
  }, []);
  
  if (!isVisible || !report) {
    return (
      <button
        onClick={runDiagnostic}
        className="fixed bottom-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm z-50 hover:bg-blue-600 transition-colors"
        title="Executar Diagnóstico de Fontes"
      >
        🔍 Diagnóstico
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 left-4 bg-card border border-border rounded-lg shadow-lg p-4 max-w-md z-50 font-sans">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Diagnóstico de Fontes
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className={report.fontStandardCompliant ? '✅' : '❌'}>
            {report.fontStandardCompliant ? '✅' : '❌'}
          </span>
          <span className="text-zinc-800 dark:text-zinc-200">
            Padrão de Fontes: {report.fontStandardCompliant ? 'Conforme' : 'Não Conforme'}
          </span>
        </div>
        
        <div className="text-zinc-800 dark:text-zinc-200">
          <strong>Elementos:</strong> {report.totalElements}
        </div>
        
        <div className="text-zinc-800 dark:text-zinc-200">
          <strong>Estilos Inline:</strong> {report.elementsWithInlineStyles}
        </div>
        
        <div className="text-zinc-800 dark:text-zinc-200">
          <strong>Famílias de Fonte:</strong> {report.uniqueFontFamilies.length}
        </div>
        
        {report.renderingIssues.length > 0 && (
          <div>
            <strong className="text-red-600 dark:text-red-400">Problemas:</strong>
            <ul className="list-disc list-inside mt-1 text-xs text-zinc-700 dark:text-zinc-300">
              {report.renderingIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        
        {report.recommendations.length > 0 && (
          <div>
            <strong className="text-yellow-600 dark:text-yellow-400">Recomendações:</strong>
            <ul className="list-disc list-inside mt-1 text-xs text-zinc-700 dark:text-zinc-300">
              {report.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={runDiagnostic}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
          >
            Atualizar
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar exemplo de fontes padronizadas
export const FontExample: React.FC = () => {
  return (
    <div className="p-6 bg-card rounded-lg shadow-md font-sans">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
        Exemplo de Fontes Padronizadas
      </h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Título de Matéria (Grade) - text-xl
          </h3>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Título de Matéria (Lista) - text-lg
          </h3>
        </div>
        
        <div className="space-y-2">
          <span className="block text-zinc-800 dark:text-zinc-200">
            Nome do Tópico 1
          </span>
          <span className="block text-zinc-800 dark:text-zinc-200">
            Nome do Tópico 2
          </span>
          <span className="block text-zinc-800 dark:text-zinc-200">
            Nome do Tópico 3
          </span>
        </div>
        
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-4">
          Fonte aplicada: ui-sans-serif, system-ui, sans-serif
        </div>
      </div>
    </div>
  );
};