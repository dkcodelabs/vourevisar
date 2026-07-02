import { supabase } from '@/integrations/supabase/client';

export type CycleStudyEventType =
  | 'topic_started'
  | 'topic_reviewed'
  | 'topic_continued'
  | 'subject_marked_studied'
  | 'subject_returned_to_queue'
  | 'cycle_reordered';

export type RecordCycleStudyEventInput = {
  userId: string;
  userCycleId?: string | null;
  cycleNumber: number;
  eventType: CycleStudyEventType;
  subjectId?: string | null;
  topicId?: string | null;
  editalId?: string | null;
  subjectPosition?: number | null;
  cycleOrderSnapshot?: string[];
  metadata?: Record<string, unknown>;
};

export const recordCycleStudyEvent = async ({
  userId,
  userCycleId,
  cycleNumber,
  eventType,
  subjectId,
  topicId,
  editalId,
  subjectPosition,
  cycleOrderSnapshot = [],
  metadata = {},
}: RecordCycleStudyEventInput) => {
  try {
    const { error } = await supabase
      .from('cycle_study_events')
      .insert({
        user_id: userId,
        user_cycle_id: userCycleId || null,
        cycle_number: Math.max(1, cycleNumber || 1),
        event_type: eventType,
        subject_id: subjectId || null,
        topic_id: topicId || null,
        edital_id: editalId || null,
        subject_position: subjectPosition || null,
        cycle_order_snapshot: cycleOrderSnapshot,
        metadata,
      });

    if (error) {
      console.warn('[cycleStudyEvents] evento não registrado:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[cycleStudyEvents] evento indisponível:', error);
    return false;
  }
};
