import React from 'react';

// Componente de exemplo seguindo o padrão da página ciclo
export const SubjectTitle: React.FC<{ 
  children: React.ReactNode; 
  viewMode?: 'grid' | 'list';
  className?: string;
}> = ({ children, viewMode = 'grid', className = '' }) => {
  const sizeClass = viewMode === 'list' ? 'text-lg' : 'text-xl';
  
  return (
    <h3 className={`${sizeClass} font-bold text-zinc-900 dark:text-zinc-100 ${className}`}>
      {children}
    </h3>
  );
};

export const TopicName: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <span className={`text-zinc-800 dark:text-zinc-200 ${className}`}>
      {children}
    </span>
  );
};

// Exemplo de card de matéria padronizado
export const StandardSubjectCard: React.FC<{
  title: string;
  topics: string[];
  viewMode?: 'grid' | 'list';
}> = ({ title, topics, viewMode = 'grid' }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden">
      <div className="p-6">
        <SubjectTitle viewMode={viewMode}>{title}</SubjectTitle>
        <div className="mt-4 space-y-2">
          {topics.map((topic, index) => (
            <div key={index} className="flex items-center p-2">
              <TopicName>{topic}</TopicName>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Hook para verificar se as fontes estão sendo aplicadas corretamente
export const useFontCheck = () => {
  React.useEffect(() => {
    const checkFonts = () => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      const fontFamily = computedStyle.fontFamily;
      
      console.log('Font family aplicada:', fontFamily);
      
      // Verifica se está usando a pilha de fontes correta
      const expectedFonts = ['ui-sans-serif', 'system-ui', 'sans-serif'];
      const hasCorrectFont = expectedFonts.some(font => 
        fontFamily.toLowerCase().includes(font.toLowerCase())
      );
      
      if (!hasCorrectFont) {
        console.warn('⚠️ Fonte não padronizada detectada:', fontFamily);
      } else {
        console.log('✅ Fonte padronizada aplicada corretamente');
      }
    };
    
    // Verifica após o carregamento
    setTimeout(checkFonts, 100);
  }, []);
};