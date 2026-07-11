import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Subject } from '@/types';
import type { StudyCycleAlert } from '@/utils/studyCycleAlerts';

import { useCycleStrategicAlertActions } from './useCycleStrategicAlertActions';

const makeSubject = (id: string, name = 'Direito Constitucional'): Subject => ({
  id,
  name,
  status: 'Em Estudo',
  edital_id: 'edital-1',
  is_visible: true,
  topics: [{
    id: 'topic-1',
    name: 'Controle de Constitucionalidade',
    completed: false,
    reviewCount: 0,
    review_count: 0,
    is_active: true,
    is_hidden: false,
  }],
});

const makeAlert = (overrides: Partial<StudyCycleAlert>): StudyCycleAlert => ({
  id: 'alert-1',
  severity: 'warning',
  title: 'Alerta',
  message: 'Mensagem',
  evidence: 'Evidência',
  actionType: 'none',
  ...overrides,
});

describe('useCycleStrategicAlertActions', () => {
  it('abre o editor da data do ciclo para alertas de prova vencida', () => {
    const openCycleExamDateEditor = vi.fn();

    const { result } = renderHook(() => useCycleStrategicAlertActions({
      expandedSubjectList: [],
      focusSubject: vi.fn(),
      handleCycleTopicStudyAction: vi.fn(),
      handleStartWeightEdit: vi.fn(),
      navigate: vi.fn(),
      openCycleExamDateEditor,
    }));

    result.current.handleStrategicAlertAction(makeAlert({
      actionType: 'edit_cycle_exam_date',
    }));

    expect(openCycleExamDateEditor).toHaveBeenCalledTimes(1);
  });

  it('inicia edicao de peso e foca na materia quando o alerta pede preenchimento', () => {
    const subject = makeSubject('subject-1');
    const focusSubject = vi.fn();
    const handleStartWeightEdit = vi.fn();

    const { result } = renderHook(() => useCycleStrategicAlertActions({
      expandedSubjectList: [{ id: subject.id, subject }],
      focusSubject,
      handleCycleTopicStudyAction: vi.fn(),
      handleStartWeightEdit,
      navigate: vi.fn(),
      openCycleExamDateEditor: vi.fn(),
    }));

    result.current.handleStrategicAlertAction(makeAlert({
      actionType: 'fill_weight',
      subjectId: subject.id,
    }));

    expect(handleStartWeightEdit).toHaveBeenCalledWith(subject);
    expect(focusSubject).toHaveBeenCalledWith(subject.id);
  });

  it('foca na materia e inicia o topico para alertas de primeiro contato', () => {
    const focusSubject = vi.fn();
    const handleCycleTopicStudyAction = vi.fn();

    const { result } = renderHook(() => useCycleStrategicAlertActions({
      expandedSubjectList: [],
      focusSubject,
      handleCycleTopicStudyAction,
      handleStartWeightEdit: vi.fn(),
      navigate: vi.fn(),
      openCycleExamDateEditor: vi.fn(),
    }));

    result.current.handleStrategicAlertAction(makeAlert({
      actionType: 'start_topic',
      subjectId: 'subject-1',
      topicId: 'topic-1',
    }));

    expect(focusSubject).toHaveBeenCalledWith('subject-1');
    expect(handleCycleTopicStudyAction).toHaveBeenCalledWith('topic-1');
  });

  it('redireciona para meus editais quando o alerta pede abrir edital', () => {
    const navigate = vi.fn();

    const { result } = renderHook(() => useCycleStrategicAlertActions({
      expandedSubjectList: [],
      focusSubject: vi.fn(),
      handleCycleTopicStudyAction: vi.fn(),
      handleStartWeightEdit: vi.fn(),
      navigate,
      openCycleExamDateEditor: vi.fn(),
    }));

    result.current.handleStrategicAlertAction(makeAlert({
      actionType: 'open_edital',
    }));

    expect(navigate).toHaveBeenCalledWith('/meus-editais');
  });
});
