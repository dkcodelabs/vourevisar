# Editor da data da prova do ciclo

## Problema

O alerta de data vencida do ciclo direciona o aluno para `Meus Editais`, mas essa tela altera a data de um edital individual. Em ciclos compostos, a fonte de verdade do prazo e `user_cycles.exam_date`, portanto o CTA atual não resolve o alerta.

## Decisao

- O CTA `Atualizar data` abre um dialogo na propria pagina Ciclo.
- O dialogo edita apenas `user_cycles.exam_date` do ciclo ativo do usuario autenticado.
- A persistencia fica em um service, protegida pelo RLS existente e filtrada por `user_id` e `status = active`.
- A coordenacao assincrona usa uma mutation do TanStack Query.
- O retorno do update deve conter exatamente o ciclo atualizado; ausencia de linha e tratada como erro.
- Sucesso atualiza o cache local do ciclo, fecha o dialogo, mostra feedback e dispara `cycleUpdated` para recalcular os consumidores da data.
- Datas de editais individuais e agendas SRS nao sao alteradas. A agenda usa a data do edital do topico e pertence a outro contrato de dominio.

## Interface

O dialogo usa os componentes shadcn/Radix existentes, input nativo de data e dois comandos: cancelar e salvar. O valor vazio e persistido como `null`, permitindo remover uma data incorreta. Erros permanecem visiveis e o dialogo continua aberto para nova tentativa.

## Verificacao

- Teste unitario do service para sanitizacao, ownership e retorno obrigatorio.
- Teste do hook para atualizacao de estado/cache no sucesso, preservacao no erro, evento e feedback.
- Teste do alerta para o novo tipo de acao.
- Validacao visual autenticada em desktop e mobile.
