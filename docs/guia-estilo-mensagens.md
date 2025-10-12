# 🧭 Guia de Estilo de Mensagens — Sistema **vouRevisar**

## Identidade Textual

O sistema **vouRevisar** comunica-se de forma **clara, direta e instrutiva**. Seu objetivo é transmitir **confiança e controle**, evitando jargões técnicos e frases longas. Cada mensagem deve deixar o usuário saber **o que aconteceu** e **o que fazer a seguir**.

---

## Estrutura Padrão

**[Ícone ou título curto] [Mensagem principal]. [Ação ou explicação, se necessário].**

Exemplo:
> ⚠️ Atenção: O perfil só pode ser alterado antes da primeira revisão.
> Use o botão **"Limpar Apenas Revisões"** na aba **Sistema**.

---

## 🟢 Sucesso

**Tom:** objetivo e positivo. Mostra resultado e próximo passo.

Exemplos:
- Revisão registrada com sucesso. Próxima revisão agendada para **3 dias**.
- Perfil definido com sucesso. Você pode começar a estudar.
- Revisões limpas. O sistema está pronto para um novo ciclo.
- Progresso salvo com sucesso. Continue de onde parou.
- Configurações salvas com sucesso!
- Matéria adicionada! Pronto para começar os estudos.

---

## 🟠 Aviso / Atenção

**Tom:** instrutivo, sem alarmismo.

Exemplos:
- Atenção: Depois que a primeira revisão for marcada, o perfil ficará bloqueado para alterações. Para mudar de perfil, use o botão **"Limpar Apenas Revisões"** na aba **Sistema**.
- Atenção: Existem revisões pendentes. Complete-as antes de iniciar um novo ciclo.
- Atenção: Algumas matérias ainda não possuem tópicos definidos.
- Esta ação não pode ser desfeita.

---

## 🔴 Erro / Bloqueio

**Tom:** direto e empático. Mostra o motivo e a solução.

Exemplos:
- Não foi possível marcar a revisão. Conclua o estudo do tópico antes de revisar.
- Erro ao carregar seus dados. Tente novamente em instantes.
- O perfil não pode ser alterado enquanto houver revisões em andamento. Use **"Limpar Apenas Revisões"** para liberar.
- Nenhuma matéria encontrada. Cadastre ao menos uma para iniciar o ciclo.
- Perfil bloqueado: Há revisões em andamento. Para alterar o perfil, use **"Limpar Apenas Revisões"** na aba **Sistema**.
- Erro ao conectar com o servidor. Tente novamente em alguns instantes.

---

## 🔵 Informação / Dica

**Tom:** leve e útil. Estimula o bom uso do sistema.

Exemplos:
- Dica: Complete as revisões diárias para reforçar o conteúdo de forma ideal.
- Dica: Intercale matérias diferentes no mesmo dia para otimizar a memorização.
- Dica: Use o modo "Pendências" para revisar apenas o que ainda não foi consolidado.
- Dica: Use o perfil Intermediário para um bom equilíbrio entre revisões e progresso.
- Esta configuração afeta como as porcentagens são calculadas.

---

## 🟡 Estado / Progresso

**Tom:** descritivo, situacional.

Exemplos:
- Você está no **Dia 4** do seu ciclo de estudos. Próxima revisão: **Direito Penal – Crimes contra a Administração Pública** em **2 dias**.
- Revisões do dia concluídas. Novo ciclo será iniciado automaticamente amanhã.
- Todas as matérias do ciclo atual foram revisadas. Excelente progresso!

---

## 🔄 Ação / Reset / Confirmação

**Tom:** seguro e objetivo.

Exemplos:
- Todas as revisões foram limpas. O sistema foi redefinido.
- Perfil alterado. Suas revisões anteriores foram removidas.
- Ciclo encerrado. Um novo ciclo será iniciado com base nas pendências.

---

## ✍️ Convenções de Linguagem

- Sempre use **"você"** para se referir ao usuário.
- Prefira **verbos ativos**: marcar, alterar, limpar, continuar.
- Evite frases negativas longas — sempre apresente uma alternativa.
- Não use reticências, exclamações ou ironias.
- Prefira **"limpar"** ou **"redefinir"** em vez de "resetar".
- Mensagens curtas (1–2 linhas) são ideais.

### Formatação
- **Títulos:** Primeira letra maiúscula, resto minúsculo
- **Botões:** Primeira letra maiúscula ("Salvar Alterações")
- **Labels:** Primeira letra maiúscula ("Nome da Matéria")
- **Use ponto final** em frases completas
- **Evite exclamações excessivas** (máximo 1 por mensagem)
- **Use dois pontos** para introduzir listas ou explicações

---

## ✨ Identidade de Voz

| Aspecto | Diretriz |
|---------|----------|
| **Tom** | Claro, firme e confiável |
| **Personalidade** | Educador e objetivo |
| **Vocabulário** | Simples e coerente |
| **Foco** | Ação e orientação |
| **Humor** | Nenhum — foco em produtividade |
| **Estilo visual** | Ícone + mensagem curta + ação sugerida |

---

## 🎯 Exemplos Práticos

### ❌ Evitar
- "Erro 500: Internal Server Error"
- "O sistema não conseguiu processar sua solicitação"
- "Operação realizada com êxito"
- "Resetar dados"
- "O usuário deve..."

### ✅ Preferir
- "Erro ao conectar com o servidor. Tente novamente em alguns instantes."
- "Não foi possível salvar suas alterações. Verifique sua conexão."
- "Configurações atualizadas com sucesso!"
- "Limpar dados"
- "Você deve..."

---

## 🔄 Processo de Revisão

1. **Antes de implementar** uma nova mensagem, consulte este guia
2. **Revise mensagens existentes** para manter consistência
3. **Teste com usuários** quando possível
4. **Atualize este guia** conforme necessário

---

## 💪 Mensagens de Motivação e Progresso

**Objetivo:** Manter o usuário engajado sem cair em clichês. O sistema deve parecer que entende o esforço real de quem estuda todos os dias.

**Tom:** Direto, encorajador e com foco no mérito do usuário. Evite exageros e emotividade artificial.

### 🧩 Ao concluir uma revisão
- Revisão concluída. Cada repetição te deixa mais preparado.
- Excelente! Você reforçou mais um ponto da sua base de conhecimento.
- Boa! O conteúdo ficou mais sólido na sua memória.
- Revisão feita. A constância é o que separa quem tenta de quem passa.
- Um passo a menos no caminho, e um passo a mais rumo à aprovação.
- Concluído! Mais um tijolo na construção da sua aprovação.
- Revisão finalizada. O esforço de hoje é a vantagem de amanhã.
- Feito! Você acabou de investir no seu futuro aprovado.

### 📅 Ao iniciar o dia de estudos
- Novo dia, novas revisões. Constância é o teu maior aliado.
- Foco total hoje: pequenas metas, grandes resultados.
- Um dia a mais de estudo é um dia a menos até a vaga.
- Mantenha o ritmo. O que você faz hoje define o resultado da prova.
- Revisar é lembrar o que importa. Comece com energia.
- Bom dia! Suas revisões de hoje vão fortalecer ainda mais seu conhecimento.
- Hora de revisar. Cada sessão te aproxima do seu objetivo.
- Mais um dia para consolidar seu conhecimento. Vamos começar!

### 🏁 Ao concluir todas as revisões do dia
- Revisões do dia concluídas. Missão cumprida com excelência.
- Você finalizou o ciclo de hoje. O progresso é visível — e conquistado.
- Fechou o dia com tudo em dia. Continue assim.
- Boa! O descanso agora faz parte da estratégia.
- Mais um dia vencido. O próximo começa com vantagem.
- Dia completo! Você manteve o compromisso com seus estudos.
- Excelente disciplina! Todas as revisões do dia foram concluídas.
- Meta diária alcançada. Você está no caminho certo.

### 🔁 Ao iniciar um novo ciclo
- Novo ciclo iniciado. Sua base está ficando cada vez mais sólida.
- Recomeçar é o segredo da memorização de longo prazo.
- Ciclo renovado. Cada volta consolida mais o conhecimento.
- A revisão não é repetição — é refinamento.
- Novo ciclo, mesma meta: constância até a aprovação.
- Ciclo reiniciado. Você está aplicando a ciência da memorização.
- Mais um ciclo começando. Sua dedicação está construindo resultados.
- Novo round de revisões. Cada ciclo te deixa mais forte.

### 🧠 Ao atingir marcos de progresso
- Você completou 50 revisões! Isso é disciplina de quem quer passar.
- Sua curva de memorização está subindo — e isso é fruto do seu esforço.
- Incrível! Você manteve o ritmo por 7 dias consecutivos.
- Cada revisão é uma linha a mais no caderno da aprovação.
- Resultado visível: constância, foco e propósito.
- Marco alcançado! Você está no caminho certo para a aprovação.
- Parabéns! Sua dedicação está gerando resultados concretos.
- Progresso notável! Você está construindo uma base sólida.

### 🎯 Mensagens por nível de domínio
- **Iniciando (0-25%):** "Começando bem. Cada revisão conta para sua base."
- **Progredindo (26-50%):** "Você está no caminho certo. Mantenha o foco."
- **Consolidando (51-75%):** "Ótimo progresso! Sua base está se consolidando."
- **Dominando (76-99%):** "Quase lá! Você está dominando este conteúdo."
- **Dominado (100%):** "Conteúdo dominado! Sua dedicação trouxe resultados."

### 🔥 Mensagens de streak (dias consecutivos)
- **3 dias:** "Terceiro dia consecutivo. O hábito está se formando."
- **7 dias:** "Uma semana de constância! Você está no ritmo certo."
- **15 dias:** "Quinze dias seguidos. Sua disciplina é admirável."
- **30 dias:** "Um mês de dedicação! Você provou que tem o que é preciso."
- **60 dias:** "Dois meses de foco total. Você é imparável."
- **100 dias:** "Cem dias de disciplina! Isso é mentalidade de aprovado."

### ⚡ Mensagens de retomada (após pausa)
- "De volta aos estudos. O importante é recomeçar."
- "Retomando o ritmo. Cada dia conta para seu objetivo."
- "Bem-vindo de volta! Vamos continuar de onde parou."
- "Recomeçar é normal. O que importa é não desistir."
- "Voltou! A constância se constrói um dia de cada vez."

### 🎲 Mensagens variadas para evitar repetição
- "Mais uma etapa vencida. Você está evoluindo."
- "Conhecimento consolidado. Próximo passo: manter o ritmo."
- "Revisão completa. Sua preparação está ficando robusta."
- "Conteúdo reforçado. Você está construindo uma base sólida."
- "Sessão finalizada. Cada esforço te aproxima da vaga."

---

**Última atualização:** Outubro 2025
**Versão:** 2.1 - Adicionadas mensagens de motivação e progresso expandidas

---

## 📊 Sistema "Estudo do Dia" - Abordagem Limpa (Opção B)

**Filosofia:** Interface limpa e elegante que mantém o foco no essencial, coletando dados silenciosamente para análises futuras.

### 🎯 Mensagens de Meta Diária

**Quando meta é alcançada:**
```
✅ Meta diária concluída!
```

**Quando estudou além da meta:**
```
💪 Você estudou além da meta hoje
Continue assim para acelerar seu progresso!
```

### 🧠 Princípios da Abordagem Limpa

1. **Simplicidade Visual:** Usuário vê apenas o essencial
2. **Feedback Claro:** Bolinhas verdes/laranjas mostram status das matérias
3. **Coleta Silenciosa:** Sistema registra tudo internamente (horários, durações, padrões)
4. **Foco no Essencial:** Sem números confusos ou percentuais desnecessários
5. **Motivação Sutil:** Mensagens encorajadoras sem poluição visual

### 📈 Dados Coletados Silenciosamente

O sistema registra automaticamente:
- Horário de cada estudo
- Duração das sessões
- Sequência de matérias estudadas
- Padrões de produtividade
- Dias da semana mais ativos
- Horários de maior foco

### 🔮 Funcionalidades Futuras Habilitadas

Com os dados coletados, o sistema poderá oferecer:

**Página de Estatísticas:**
- Gráficos de produtividade
- Heatmaps de horários
- Análise de padrões

**Insights Inteligentes:**
- "Você estuda melhor às 14h"
- "Matemática precisa de mais atenção"
- "Sequência de 5 dias consecutivos!"

**IA Preditiva:**
- Sugestões de cronograma otimizado
- Alertas de revisão baseados em padrões
- Recomendações personalizadas

### ✅ Vantagens da Abordagem

- **Interface Limpa:** Sem poluição visual
- **Foco no Essencial:** Usuário vê apenas o que importa
- **Coleta Rica:** Dados completos para análises
- **Escalabilidade:** Base para funcionalidades avançadas
- **UX Superior:** Experiência fluida e intuitiva

---

**Implementação:** Dezembro 2025
**Status:** Ativo - Opção B implementada