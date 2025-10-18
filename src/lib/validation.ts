import { z } from 'zod';

/**
 * Shared validation schemas for consistent input validation across the application
 * These schemas help prevent XSS, injection attacks, and data integrity issues
 */

export const subjectNameSchema = z.string()
  .trim()
  .min(1, 'Nome da matéria é obrigatório')
  .max(200, 'Nome da matéria deve ter no máximo 200 caracteres')
  .refine(val => val.length > 0, 'Nome não pode conter apenas espaços');

export const topicNameSchema = z.string()
  .trim()
  .min(1, 'Nome do tópico é obrigatório')
  .max(500, 'Nome do tópico deve ter no máximo 500 caracteres')
  .refine(val => val.length > 0, 'Nome não pode conter apenas espaços');

export const noteContentSchema = z.string()
  .max(100000, 'Conteúdo da anotação deve ter no máximo 100.000 caracteres');

export const reminderTextSchema = z.string()
  .trim()
  .min(1, 'Texto do lembrete é obrigatório')
  .max(1000, 'Texto do lembrete deve ter no máximo 1000 caracteres');

export const reminderDateSchema = z.date()
  .refine(date => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Data do lembrete não pode ser no passado'
  });

// Edge function request schemas
export const generateQuestionsRequestSchema = z.object({
  subject: subjectNameSchema,
  topic: topicNameSchema,
  bank: z.string().trim().min(1, 'Banca é obrigatória').max(100),
  quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1').max(20, 'Quantidade máxima é 20'),
  difficulty: z.enum(['facil', 'medio', 'dificil'], {
    errorMap: () => ({ message: 'Dificuldade deve ser: facil, medio ou dificil' })
  }),
  type: z.enum(['multipla-escolha', 'verdadeiro-falso', 'dissertativa'], {
    errorMap: () => ({ message: 'Tipo deve ser: multipla-escolha, verdadeiro-falso ou dissertativa' })
  })
});

export type GenerateQuestionsRequest = z.infer<typeof generateQuestionsRequestSchema>;
