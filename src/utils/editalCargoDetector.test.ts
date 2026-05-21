import { describe, expect, it } from 'vitest';
import { detectCargoOptionsFromEditalText } from './editalCargoDetector';

describe('editalCargoDetector', () => {
  it('detects sequential cargo headings and stops before requirements', () => {
    const text = [
      '1 DAS DISPOSICOES PRELIMINARES',
      '2 DO CARGOS',
      'CARGO 1: ANALISTA JUDICIÁRIO – ÁREA: ADMINISTRATIVA REQUISITO: diploma em nível superior.',
      'DESCRIÇÃO SUMÁRIA DAS ATIVIDADES: executar atividades administrativas.',
      'CARGO 2: ANALISTA JUDICIÁRIO – APOIO ESPECIALIZADO – ESPECIALIDADE: ADMINISTRAÇÃO REQUISITOS: diploma em Administração.',
      'CARGO 3: ANALISTA JUDICIÁRIO – APOIO ESPECIALIZADO – ESPECIALIDADE – ARQUITETURA REQUISITOS: diploma em Arquitetura.',
      '3 DOS REQUISITOS PARA A INVESTIDURA',
    ].join(' ');

    const cargos = detectCargoOptionsFromEditalText(text);

    expect(cargos).toHaveLength(3);
    expect(cargos[0]).toMatchObject({
      id: 'cargo-1',
      nome_cargo: 'ANALISTA JUDICIÁRIO – ÁREA: ADMINISTRATIVA',
      label_exibicao: 'Cargo 1: ANALISTA JUDICIÁRIO – ÁREA: ADMINISTRATIVA',
      confidence: 'high',
    });
    expect(cargos[1].nome_cargo).toBe('ANALISTA JUDICIÁRIO – APOIO ESPECIALIZADO – ESPECIALIDADE: ADMINISTRAÇÃO');
    expect(cargos[2].nome_cargo).not.toContain('REQUISITOS');
  });

  it('ignores isolated cargo mentions without a reliable sequence from cargo 1', () => {
    const text = [
      'A seleção para Cargo 20: Analista Judiciário/Taquigrafia terá prova prática.',
      '4 DAS VAGAS Cargo 20: Analista Judiciário – Taquigrafia 1 vaga.',
    ].join(' ');

    expect(detectCargoOptionsFromEditalText(text)).toEqual([]);
  });
});
