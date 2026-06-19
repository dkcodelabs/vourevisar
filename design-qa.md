# Dashboard Design QA

## Referencias

- Faixa superior com concurso ativo, dias para a prova e contadores acionaveis.
- Card premium de melhor proxima acao com justificativa profissional.
- Fila operacional curta para atrasos, revisoes do dia e primeiro contato.
- Card de ritmo com calculo transparente e aviso de cobertura de cobranca.
- Lembretes com inclusao inline e conclusao por checkbox.
- Trajetoria com atividade por periodo, progresso e mapa de dificuldade.

## Comparacao final

| Prioridade | Diferenca encontrada | Correcao |
| --- | --- | --- |
| P0 | Nenhuma. | Nao aplicavel. |
| P1 | O indicador visual `No ritmo` usava uma porcentagem sem formula validada. | Removido e substituido por dias restantes e ritmos diarios calculados. |
| P1 | Periodos de 14/30 dias exibiam somente os ultimos sete dias. | O grafico agora renderiza todos os dias do periodo com rolagem interna. |
| P2 | Nome longo do edital e topico prioritario deixavam a primeira dobra alta demais. | Tipografia e proporcoes foram compactadas, preservando o nome completo. |
| P2 | Rotulos do grafico se sobrepunham em mobile e no periodo de 14 dias. | Valores e datas ganharam formato compacto; detalhe completo permanece no clique. |
| P2 | Havia controles com aparencia de acao sem comportamento correspondente. | `Entenda` ganhou explicacao real; controles decorativos sem destino foram removidos. |
| P3 | O mobile usa cards empilhados, enquanto as referencias principais sao desktop. | Desvio intencional para manter leitura, toque e hierarquia em 390px. |

## Resultado

- Desktop 1280x720: aprovado, sem overflow horizontal.
- Mobile 390x844: aprovado, sem overflow horizontal.
- Dark e light: aprovados.
- Console: sem erros ou avisos relevantes na rota.
- Interacoes verificadas: explicacao do ritmo, troca 7/14 dias, detalhe do dia e captura inline de lembrete sem persistir dado de teste.
