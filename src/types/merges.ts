export interface SubjectMerge {
  id: string;
  user_id: string;
  cycle_id: string | null;
  primary_subject_id: string;
  merged_subject_ids: string[];
  source_edital_ids?: string[];
  display_name: string;
  created_at: string;
  reverted_at: string | null;
  status: 'active' | 'reverted';
  created_by_ai: boolean;
  match_type: string | null;
}

export interface TopicMerge {
  id: string;
  user_id: string;
  cycle_id: string | null;
  subject_merge_id: string | null;
  primary_topic_id: string;
  merged_topic_ids: string[];
  source_edital_ids?: string[];
  display_name: string;
  created_at: string;
  reverted_at: string | null;
  status: 'active' | 'reverted';
  created_by_ai: boolean;
  match_type: string | null;
}

export interface MergeService {
  getUnifiedSubjectName: (subjectId: string, userId: string) => Promise<string | null>;
  getUnifiedTopicName: (topicId: string, userId: string) => Promise<string | null>;
  getSubjectMerge: (subjectId: string, userId: string) => Promise<SubjectMerge | null>;
  getTopicMerge: (topicId: string, userId: string) => Promise<TopicMerge | null>;
  revertSubjectMerge: (mergeId: string) => Promise<void>;
  revertTopicMerge: (mergeId: string) => Promise<void>;
  createSubjectMerge: (merge: Omit<SubjectMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>) => Promise<SubjectMerge>;
  createTopicMerge: (merge: Omit<TopicMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>) => Promise<TopicMerge>;
  getActiveSubjectMerges: (userId: string) => Promise<SubjectMerge[]>;
  getActiveTopicMerges: (userId: string) => Promise<TopicMerge[]>;
}
