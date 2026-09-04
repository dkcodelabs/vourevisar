import { supabase } from '@/integrations/supabase/client';

export async function persistParsedContent(userId: string, groups: Record<string, string[]>) {
  const { data: priority } = await supabase.from('subjects').select('priority').eq('user_id', userId).order('priority', { ascending: false }).limit(1).maybeSingle();
  let nextPriority = (priority?.priority || 0) + 1;
  let totalSubjects = 0; let totalTopics = 0;
  for (const [subjectName, topics] of Object.entries(groups)) {
    const { data: existing } = await supabase.from('subjects').select('id').eq('user_id', userId).eq('name', subjectName).maybeSingle();
    let subjectId = existing?.id;
    if (!subjectId) {
      const { data, error } = await supabase.from('subjects').insert({ user_id: userId, name: subjectName, status: 'Nova', color: '#3B82F6', priority: nextPriority++ }).select('id').single();
      if (error) throw error; subjectId = data.id; totalSubjects++;
    }
    const { data: max } = await supabase.from('topics').select('position').eq('subject_id', subjectId).order('position', { ascending: false }).limit(1).maybeSingle();
    const inserts = [];
    let position = (max?.position || 0) + 1;
    for (const name of topics) {
      const { data: found } = await supabase.from('topics').select('id').eq('subject_id', subjectId).eq('name', name).maybeSingle();
      if (!found) inserts.push({ subject_id: subjectId, name, completed: false, review_count: 0, position: position++ });
    }
    if (inserts.length) { const { error } = await supabase.from('topics').insert(inserts); if (error) throw error; totalTopics += inserts.length; }
  }
  return { totalSubjects, totalTopics };
}
