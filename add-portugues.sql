-- Verificar se PORTUGUÊS já existe
SELECT id, name, status FROM subjects 
WHERE name = 'PORTUGUES' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Adicionar PORTUGUÊS ao banco de dados (apenas se não existir)
INSERT INTO subjects (id, user_id, name, status, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'e245ef9d-fc38-48f9-b3b2-e887a211a1b2',
    'PORTUGUES',
    'Nova',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM subjects 
    WHERE name = 'PORTUGUES' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
);

-- Verificar se foi criado
SELECT id, name, status FROM subjects 
WHERE name = 'PORTUGUES' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Adicionar um tópico básico para o PORTUGUÊS (apenas se não existir)
INSERT INTO topics (id, subject_id, name, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    s.id,
    'crase',
    NOW(),
    NOW()
FROM subjects s
WHERE s.name = 'PORTUGUES' AND s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
AND NOT EXISTS (
    SELECT 1 FROM topics t 
    WHERE t.subject_id = s.id AND t.name = 'crase'
);

-- Adicionar PORTUGUÊS ao ciclo atual
UPDATE user_cycles 
SET ciclo_atual = array_append(ciclo_atual, (
    SELECT id::text FROM subjects 
    WHERE name = 'PORTUGUES' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
)),
atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
AND NOT ((SELECT id::text FROM subjects WHERE name = 'PORTUGUES' AND user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2') = ANY(ciclo_atual));

-- Verificar resultado final
SELECT 
    ciclo_atual,
    array_length(ciclo_atual, 1) as total_no_ciclo
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';