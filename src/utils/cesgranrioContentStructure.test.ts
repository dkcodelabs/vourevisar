import { describe, expect, it } from 'vitest';
import { mergeRecoveredCesgranrioBasicSubjects, recoverCesgranrioBasicSubjects } from './cesgranrioContentStructure';

const TRANSPETRO_BASIC_EXCERPT = `
Fundação Cesgranrio

ANEXO IV- CONTEÚDOS PROGRAMÁTICOS

CONHECIMENTOS BÁSICOS
CARGOS: CONDUTOR MECÂNICO / CONDUTOR BOMBEADOR / AUXILIAR DE SAÚDE / COZINHEIRO / MOÇO DE
MÁQUINAS / ELETRICISTA / MOÇO DE CONVÉS / TAIFEIRO
LÍNGUA PORTUGUESA
1- Compreensão de textos de gêneros variados. 2- Ortografia oficial.
CARGOS: CONDUTOR MECÂNICO / CONDUTOR BOMBEADOR / ELETRICISTA
INGLÊS TÉCNICO MARÍTIMO
1. Compreensão de texto escrito em língua inglesa. 2. Itens gramaticais relevantes.

CARGOS: SEGUNDO OFICIAL DE MÁQUINAS / SEGUNDO OFICIAL DE NÁUTICA

LÍNGUA PORTUGUESA
1- Compreensão de textos. 2- Ortografia oficial.
LÍNGUA INGLESA
1. Compreensão de texto escrito em língua inglesa.

CONHECIMENTOS ESPECÍFICOS
CARGO: CONDUTOR MECÂNICO
Arquitetura Naval: 1 Nomenclatura do navio.
`;

const TRANSPETRO_BASIC_COMPACT_EXCERPT = `
Fundação Cesgranrio ANEXO IV- CONTEÚDOS PROGRAMÁTICOS CONHECIMENTOS BÁSICOS
CARGOS: CONDUTOR MECÂNICO / CONDUTOR BOMBEADOR / AUXILIAR DE SAÚDE / COZINHEIRO / MOÇO DE MÁQUINAS / ELETRICISTA / MOÇO DE CONVÉS / TAIFEIRO LÍNGUA PORTUGUESA 1- Compreensão de textos de gêneros variados. 2- Ortografia oficial.
CARGOS: CONDUTOR MECÂNICO / CONDUTOR BOMBEADOR / ELETRICISTA INGLÊS TÉCNICO MARÍTIMO 1. Compreensão de texto escrito em língua inglesa. 2. Itens gramaticais relevantes.
CARGOS: SEGUNDO OFICIAL DE MÁQUINAS / SEGUNDO OFICIAL DE NÁUTICA LÍNGUA PORTUGUESA 1- Compreensão de textos. LÍNGUA INGLESA 1. Compreensão de texto escrito em língua inglesa.
CONHECIMENTOS ESPECÍFICOS CARGO: CONDUTOR MECÂNICO Arquitetura Naval: 1 Nomenclatura do navio.
`;

const TRANSPETRO_WITH_PREAMBLE_EXCERPT = `
Fundação Cesgranrio. As provas objetivas serão de conhecimentos básicos e conhecimentos específicos.
ANEXO IV - CONTEÚDOS PROGRAMÁTICOS CONHECIMENTOS BÁSICOS
CARGOS: CONDUTOR MECÂNICO / CONDUTOR BOMBEADOR / AUXILIAR DE SAÚDE / COZINHEIRO / MOÇO DE MÁQUINAS / ELETRICISTA / MOÇO DE CONVÉS / TAIFEIRO LÍNGUA PORTUGUESA 1- Compreensão de textos de gêneros variados. 2- Ortografia oficial.
CARGOS: CONDUTOR MECÂNICO / CONDUTOR BOMBEADOR / ELETRICISTA INGLÊS TÉCNICO MARÍTIMO 1. Compreensão de texto escrito em língua inglesa. 2. Itens gramaticais relevantes.
CONHECIMENTOS ESPECÍFICOS CARGO: AUXILIAR DE SAÚDE Arquitetura Naval: 1 Nomenclatura do navio.
`;

const CASA_DA_MOEDA_LEVEL_SCOPED_EXCERPT = `
Fundação Cesgranrio. 7.1.1ª ETAPA: 1ª Fase - Constituída de Provas Objetivas (múltipla escolha) de Língua Portuguesa.
ANEXO III – CONTEÚDOS PROGRAMÁTICOS
NÍVEL MÉDIO: TÉCNICO DE SEGURANÇA
PORTUGUÊS - I. Compreensão de texto. II. Ortografia oficial. III. Pontuação.
MATEMÁTICA - I. Conjuntos numéricos. II. Sistemas de unidades de medidas.
NÍVEL SUPERIOR: ANALISTA DE PRODUÇÃO – DESIGNER DE VALORES - GRAVADOR
PORTUGUÊS - I. Compreensão de texto. II. Ortografia oficial: emprego das letras e acentuação gráfica. III. Emprego do sinal indicativo de crase. IV. As classes de palavras: aspectos morfológicos, sintáticos e estilísticos.
V. Emprego de verbos. VI. Concordância verbal e nominal. VII. Regência nominal e verbal. VIII. Emprego dos pronomes. IX. Colocação dos pronomes oblíquos. X. Significação das palavras. XI. Pontuação.
CONHECIMENTOS ESPECÍFICOS
1 História da Arte. 1.1 Arte pré-histórica.
`;

describe('recoverCesgranrioBasicSubjects', () => {
  it('accumulates all Conhecimentos Basicos subscopes that include the selected cargo', () => {
    const recovered = recoverCesgranrioBasicSubjects(
      TRANSPETRO_BASIC_EXCERPT,
      'CONDUTOR MECÂNICO (CDM/MEC)',
    );

    expect(recovered.map((subject) => subject.titulo)).toEqual([
      'LÍNGUA PORTUGUESA',
      'INGLÊS TÉCNICO MARÍTIMO',
    ]);
  });

  it('handles compact PDF text where headings and topics are on the same line', () => {
    const recovered = recoverCesgranrioBasicSubjects(
      TRANSPETRO_BASIC_COMPACT_EXCERPT,
      'CONDUTOR MECÂNICO (CDM/MEC)',
    );

    expect(recovered.map((subject) => subject.titulo)).toEqual([
      'LÍNGUA PORTUGUESA',
      'INGLÊS TÉCNICO MARÍTIMO',
    ]);
  });

  it('ignores introductory mentions of conhecimentos basicos before the content annex', () => {
    const recovered = recoverCesgranrioBasicSubjects(
      TRANSPETRO_WITH_PREAMBLE_EXCERPT,
      'CONDUTOR MECÂNICO (CDM/MEC)',
    );

    expect(recovered.map((subject) => subject.titulo)).toEqual([
      'LÍNGUA PORTUGUESA',
      'INGLÊS TÉCNICO MARÍTIMO',
    ]);
  });

  it('adds a missing basic subject without duplicating one already mapped by AI', () => {
    const merged = mergeRecoveredCesgranrioBasicSubjects(
      [{
        chave: 'ingles_tecnico_maritimo',
        titulo: 'INGLÊS TÉCNICO MARÍTIMO',
        tipo_conhecimento: 'Conhecimentos Básicos',
        ordem: 1,
        startHeading: 'INGLÊS TÉCNICO MARÍTIMO',
      }],
      TRANSPETRO_BASIC_EXCERPT,
      'CONDUTOR MECÂNICO (CDM/MEC)',
    );

    expect(merged.map((subject) => subject.titulo)).toEqual([
      'LÍNGUA PORTUGUESA',
      'INGLÊS TÉCNICO MARÍTIMO',
    ]);
  });

  it('recovers basic subjects scoped by nivel and ignores earlier prova sections', () => {
    const recovered = recoverCesgranrioBasicSubjects(
      CASA_DA_MOEDA_LEVEL_SCOPED_EXCERPT,
      'ANALISTA DE PRODUÇÃO – DESIGNER DE VALORES - GRAVADOR',
    );

    expect(recovered).toHaveLength(1);
    expect(recovered[0]).toMatchObject({
      titulo: 'PORTUGUÊS',
      tipo_conhecimento: 'Conhecimentos Básicos',
    });
    expect(recovered[0].firstTopicAnchor).toContain('I. Compreensão de texto');
    expect(recovered[0].firstTopicAnchor).not.toContain('7.1.1ª ETAPA');
  });

  it('replaces wrong AI anchors for recovered Cesgranrio basic subjects', () => {
    const merged = mergeRecoveredCesgranrioBasicSubjects(
      [{
        chave: 'portugues',
        titulo: 'PORTUGUÊS',
        tipo_conhecimento: 'Conhecimentos Básicos',
        ordem: 1,
        startHeading: '7.1.1ª ETAPA',
        firstTopicAnchor: '7.1.1ª ETAPA',
      }],
      CASA_DA_MOEDA_LEVEL_SCOPED_EXCERPT,
      'ANALISTA DE PRODUÇÃO – DESIGNER DE VALORES - GRAVADOR',
    );

    expect(merged[0].startHeading).toContain('PORTUGUÊS I. Compreensão');
    expect(merged[0].firstTopicAnchor).toContain('I. Compreensão de texto');
  });
});
