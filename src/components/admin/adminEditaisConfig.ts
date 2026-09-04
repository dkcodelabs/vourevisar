export const PRESET_CATEGORIES = ['Carreiras Policiais', 'Judiciário', 'Administrativo', 'Bancárias', 'Educação', 'Saúde', 'Militar', 'Outros'];

export const RESPONSE_TEMPLATES = {
  cadastrado: '✅ Analisamos sua sugestão e o edital foi inserido no catálogo! Bons estudos!',
  ja_cadastrado: 'ℹ️ Já disponível no catálogo. Utilize a busca em "Editais Prontos".',
  nao_cadastrado: '❌ Analisamos sua sugestão, mas não foi possível cadastrar este edital no catálogo no momento. Agradecemos pelo interesse!',
} as const;

export const STATUS_BADGE = {
  pending: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-500' },
  cadastrado: { label: 'Atendida', cls: 'bg-emerald-500/10 text-emerald-500' },
  ja_cadastrado: { label: 'Já Existia', cls: 'bg-blue-500/10 text-blue-500' },
  nao_cadastrado: { label: 'Recusada', cls: 'bg-zinc-500/10 text-zinc-400' },
} as const;

export const EMPTY_FORM = {
  organ: '', position: '', year: new Date().getFullYear().toString(), category: 'Carreiras Policiais',
  exam_date: '', exam_board: '', is_public: true,
};
