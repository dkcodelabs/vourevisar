import React from 'react';

// Utilitários para otimização de sessão e prevenção de "Session Too Long"

export const SessionOptimizer = {
  // Verifica se há problemas de renderização que podem causar sessões longas
  checkRenderingIssues: () => {
    const issues: string[] = [];
    
    // Verifica fontes inconsistentes
    const elements = document.querySelectorAll('*');
    const fontFamilies = new Set<string>();
    
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.fontFamily) {
        fontFamilies.add(style.fontFamily);
      }
    });
    
    if (fontFamilies.size > 3) {
      issues.push(`Muitas famílias de fonte detectadas (${fontFamilies.size}). Isso pode causar problemas de renderização.`);
    }
    
    // Verifica elementos com re-renderização excessiva
    const heavyElements = document.querySelectorAll('[style*="font-family"]');
    if (heavyElements.length > 10) {
      issues.push(`${heavyElements.length} elementos com font-family inline detectados. Use classes CSS.`);
    }
    
    return issues;
  },
  
  // Otimiza fontes para evitar problemas de sessão
  optimizeFonts: () => {
    // Remove font-family inline desnecessários
    const elementsWithInlineFont = document.querySelectorAll('[style*="font-family"]');
    elementsWithInlineFont.forEach(el => {
      const element = el as HTMLElement;
      if (element.style.fontFamily) {
        element.style.removeProperty('font-family');
        element.classList.add('font-sans');
      }
    });
    
    console.log(`Otimizados ${elementsWithInlineFont.length} elementos com font-family inline`);
  },
  
  // Monitora performance da sessão
  monitorSession: () => {
    let renderCount = 0;
    let lastRenderTime = Date.now();
    
    const observer = new MutationObserver(() => {
      renderCount++;
      const now = Date.now();
      
      if (now - lastRenderTime > 100) { // Se passou mais de 100ms
        if (renderCount > 50) {
          console.warn('⚠️ Muitas re-renderizações detectadas:', renderCount);
          console.log('💡 Considere otimizar componentes ou usar React.memo()');
        }
        renderCount = 0;
      }
      
      lastRenderTime = now;
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return () => observer.disconnect();
  },
  
  // Aplica otimizações automáticas
  autoOptimize: () => {
    // Aplica font-sans em elementos sem classe de fonte
    const elementsWithoutFont = document.querySelectorAll('*:not([class*="font-"])');
    elementsWithoutFont.forEach(el => {
      if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
        el.classList.add('font-sans');
      }
    });
    
    // Remove transições desnecessárias em elementos com muitas mudanças
    const heavyTransitionElements = document.querySelectorAll('[style*="transition"]');
    if (heavyTransitionElements.length > 20) {
      heavyTransitionElements.forEach(el => {
        const element = el as HTMLElement;
        element.style.transition = 'none';
      });
    }
  }
};

// Hook React para usar o otimizador
export const useSessionOptimization = () => {
  React.useEffect(() => {
    const cleanup = SessionOptimizer.monitorSession();
    
    // Executa verificações iniciais
    setTimeout(() => {
      const issues = SessionOptimizer.checkRenderingIssues();
      if (issues.length > 0) {
        console.warn('🔍 Problemas de renderização detectados:');
        issues.forEach(issue => console.warn('  -', issue));
        
        // Aplica otimizações automáticas
        SessionOptimizer.autoOptimize();
      }
    }, 1000);
    
    return cleanup;
  }, []);
};

// Função para verificar se o padrão de fontes está sendo seguido
export const validateFontStandard = (): boolean => {
  const body = document.body;
  const computedStyle = window.getComputedStyle(body);
  const fontFamily = computedStyle.fontFamily.toLowerCase();
  
  const expectedFonts = ['ui-sans-serif', 'system-ui', 'sans-serif'];
  return expectedFonts.some(font => fontFamily.includes(font));
};

// Relatório de diagnóstico completo
export const generateDiagnosticReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    fontStandardCompliant: validateFontStandard(),
    renderingIssues: SessionOptimizer.checkRenderingIssues(),
    totalElements: document.querySelectorAll('*').length,
    elementsWithInlineStyles: document.querySelectorAll('[style]').length,
    uniqueFontFamilies: Array.from(new Set(
      Array.from(document.querySelectorAll('*')).map(el => 
        window.getComputedStyle(el).fontFamily
      )
    )).filter(Boolean),
    recommendations: [] as string[]
  };
  
  // Gera recomendações
  if (!report.fontStandardCompliant) {
    report.recommendations.push('Aplicar font-sans globalmente no App.tsx');
  }
  
  if (report.renderingIssues.length > 0) {
    report.recommendations.push('Resolver problemas de renderização identificados');
  }
  
  if (report.elementsWithInlineStyles > 20) {
    report.recommendations.push('Reduzir uso de estilos inline, preferir classes CSS');
  }
  
  if (report.uniqueFontFamilies.length > 3) {
    report.recommendations.push('Padronizar famílias de fonte para reduzir variações');
  }
  
  return report;
};