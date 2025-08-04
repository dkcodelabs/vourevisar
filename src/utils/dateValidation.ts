
import { isValid, getDaysInMonth, addMonths, startOfDay } from 'date-fns';

export interface DateValidationResult {
  isValid: boolean;
  correctedDate?: Date;
  error?: string;
}

/**
 * Valida se uma data é válida e corrige datas inválidas
 */
export const validateAndCorrectDate = (year: number, month: number, day: number): DateValidationResult => {
  // Verificar se os parâmetros são números válidos
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return {
      isValid: false,
      error: 'Ano, mês e dia devem ser números inteiros'
    };
  }

  // Verificar limites básicos
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: 'Mês deve estar entre 1 e 12'
    };
  }

  if (day < 1) {
    return {
      isValid: false,
      error: 'Dia deve ser maior que 0'
    };
  }

  // Criar data base para o mês
  const baseDate = new Date(year, month - 1, 1);
  
  if (!isValid(baseDate)) {
    return {
      isValid: false,
      error: 'Data base inválida'
    };
  }

  // Obter número de dias no mês
  const daysInMonth = getDaysInMonth(baseDate);

  // Se o dia for válido para o mês
  if (day <= daysInMonth) {
    const finalDate = new Date(year, month - 1, day);
    return {
      isValid: true,
      correctedDate: startOfDay(finalDate)
    };
  }

  // Se o dia exceder o máximo do mês, rolar para o próximo mês
  const excessDays = day - daysInMonth;
  const nextMonth = addMonths(baseDate, 1);
  const correctedDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), excessDays);

  // Verificar se a data corrigida é válida
  if (!isValid(correctedDate)) {
    return {
      isValid: false,
      error: 'Não foi possível corrigir a data'
    };
  }

  return {
    isValid: false,
    correctedDate: startOfDay(correctedDate),
    error: `Dia ${day} não existe em ${month}/${year}. Corrigido para ${correctedDate.getDate()}/${correctedDate.getMonth() + 1}/${correctedDate.getFullYear()}`
  };
};

/**
 * Verifica se um ano é bissexto
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Obtém o número de dias em um mês específico
 */
export const getDaysInMonthSafe = (year: number, month: number): number => {
  const date = new Date(year, month - 1, 1);
  return getDaysInMonth(date);
};

/**
 * Adiciona dias a uma data de forma segura, corrigindo automaticamente
 * se ultrapassar o último dia do mês
 */
export const addDaysSafe = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return startOfDay(newDate);
};

/**
 * Cria uma data de revisão segura baseada no estágio de revisão
 */
export const createReviewDate = (baseDate: Date, stage: '24h' | '7 dias' | '30 dias'): Date => {
  const base = startOfDay(baseDate);
  
  switch (stage) {
    case '24h':
      return addDaysSafe(base, 1);
    case '7 dias':
      return addDaysSafe(base, 7);
    case '30 dias':
      return addDaysSafe(base, 30);
    default:
      return base;
  }
};

/**
 * Valida uma string de data no formato ISO
 */
export const validateISODate = (dateString: string): DateValidationResult => {
  try {
    const date = new Date(dateString);
    
    if (!isValid(date)) {
      return {
        isValid: false,
        error: 'Data inválida'
      };
    }
    
    return {
      isValid: true,
      correctedDate: startOfDay(date)
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Formato de data inválido'
    };
  }
};
