import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Subject } from '@/types';

type UserEditalInsert = Database['public']['Tables']['user_editais']['Insert'];
type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];
type TopicInsert = Database['public']['Tables']['topics']['Insert'];

export type EditalImportExtraInfo = {
  organ: string;
  position: string;
  year: string;
  category?: string;
  exam_date?: string;
  exam_board?: string | null;
  source_updated_at?: string | null;
};

export type EditalImportRepository = {
  createEdital: (payload: UserEditalInsert) => Promise<{ id: string }>;
  createSubject: (payload: SubjectInsert) => Promise<{ id: string }>;
  createTopics: (payload: TopicInsert[]) => Promise<void>;
  deleteEdital: (editalId: string, userId: string) => Promise<void>;
  updateEditalSubjectIds: (editalId: string, subjectIds: string[]) => Promise<void>;
};

const sanitizeExamDate = (date?: string): string | null => {
  const trimmed = date?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return Number.isNaN(new Date(`${trimmed}T00:00:00`).getTime()) ? null : trimmed;
};

const repository: EditalImportRepository = {
  async createEdital(payload) {
    const { data, error } = await supabase
      .from('user_editais')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Falha ao criar edital base.');
    return data;
  },

  async createSubject(payload) {
    const { data, error } = await supabase
      .from('subjects')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Falha ao criar matéria do edital.');
    return data;
  },

  async createTopics(payload) {
    if (payload.length === 0) return;
    const { error } = await supabase.from('topics').insert(payload);
    if (error) throw error;
  },

  async updateEditalSubjectIds(editalId, subjectIds) {
    const { error } = await supabase
      .from('user_editais')
      .update({ active_subject_ids: subjectIds, subject_ids: subjectIds })
      .eq('id', editalId);
    if (error) throw error;
  },

  async deleteEdital(editalId, userId) {
    const { error } = await supabase
      .from('user_editais')
      .delete()
      .eq('id', editalId)
      .eq('user_id', userId);
    if (error) throw error;
  },
};

type ImportEditalInput = {
  editalName?: string;
  extraInfo?: EditalImportExtraInfo;
  isImported?: boolean;
  repository?: EditalImportRepository;
  sourceId?: string;
  subjects: Subject[];
  userId: string;
};

export async function importEdital({
  editalName,
  extraInfo,
  isImported = true,
  repository: importRepository = repository,
  sourceId,
  subjects,
  userId,
}: ImportEditalInput): Promise<{ editalId: string; subjectIds: string[] }> {
  const finalName = editalName?.trim() || 'IMPORTADO';
  let createdEditalId: string | null = null;

  try {
    const edital = await importRepository.createEdital({
      active_subject_ids: [],
      category: extraInfo?.category?.trim() || null,
      exam_board: extraInfo?.exam_board?.trim() || null,
      exam_date: sanitizeExamDate(extraInfo?.exam_date),
      is_imported: isImported,
      last_sync_snapshot: sourceId ? {
        source_id: sourceId,
        source_updated_at: extraInfo?.source_updated_at ?? null,
        synced_at: new Date().toISOString(),
      } : null,
      merged_into_cycle: false,
      name: finalName,
      organ: extraInfo?.organ?.trim() || null,
      position: extraInfo?.position?.trim() || null,
      source_id: sourceId || null,
      subject_ids: [],
      user_id: userId,
      year: extraInfo?.year?.trim() || null,
    });
    createdEditalId = edital.id;

    const subjectIds: string[] = [];
    for (const subject of subjects) {
      const createdSubject = await importRepository.createSubject({
        color: subject.color || '#3b82f6',
        edital_id: edital.id,
        exam_weight_percentage: subject.exam_weight_percentage ?? null,
        exam_weight_points: subject.exam_weight_points ?? null,
        exam_weight_questions: subject.exam_weight_questions ?? null,
        exam_weight_raw: subject.exam_weight_raw ?? null,
        name: subject.name.trim(),
        status: 'Nova',
        user_id: userId,
      });
      subjectIds.push(createdSubject.id);

      const topics = (subject.topics || [])
        .filter(topic => topic.name?.trim())
        .map((topic, index): TopicInsert => ({
          completed: false,
          edital_id: edital.id,
          is_active: true,
          name: topic.name.trim(),
          position: topic.position ?? index,
          review_count: 0,
          subject_id: createdSubject.id,
        }));
      await importRepository.createTopics(topics);
    }

    await importRepository.updateEditalSubjectIds(edital.id, subjectIds);
    return { editalId: edital.id, subjectIds };
  } catch (error) {
    if (createdEditalId) {
      try {
        await importRepository.deleteEdital(createdEditalId, userId);
      } catch {
        // Preserve the original import failure; cleanup is best effort until this flow is transactional.
      }
    }
    throw error;
  }
}
