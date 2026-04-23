import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ebghgbzvdiytxuxmnvvt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hnYnp2ZGl5dHh1eG1udnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NTg3NzcsImV4cCI6MjA2MzMzNDc3N30.vhTig84oUI__MlicbM_eXVuyHe_OMZRpKppD9tAcbjQ');

async function run() {
  const { data: cycle } = await supabase.from('user_cycles').select('id, materias_estudadas_ciclo, ciclos_realizados, data_inicio_ciclo').limit(1);
  console.log('Cycle:', JSON.stringify(cycle, null, 2));

  const { data: revs } = await supabase.from('topic_review_history').select('id, reviewed_at, topic_id').order('reviewed_at', { ascending: false }).limit(5);
  console.log('Recent Reviews:', JSON.stringify(revs, null, 2));
}
run();
