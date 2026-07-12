# ADR-004 — ETA composto e preditor de IA sem escrita no NetworkState

**Status:** Aceito
**Data:** registrado retroativamente em 2026-07-12

## Contexto

O ETA exibido ao usuário não é apenas o tempo nominal de viagem. Ele precisa
refletir também o estado da rede: uma linha com atraso reportado, ou um
padrão histórico que sugere degradação iminente.

Duas fontes alimentam esse cálculo:

- **NetworkState** — o estado observado/reportado da rede (linha normal, com
  atraso, com falha, suspensa). É factual: registra o que se sabe ter
  acontecido.
- **ai-engine** — um preditor que lê o histórico (NetworkStateEvent) e produz
  uma previsão derivada, com um nível de confiança.

A questão de arquitetura é o que fazer com a saída do preditor: ela deve
atualizar o NetworkState, ou permanecer separada?

## Decisão

**O ai-engine lê o NetworkState, mas nunca escreve nele.**

A previsão é uma entrada derivada, consumida diretamente pelo cálculo de ETA e
exposta separadamente na resposta. O NetworkState permanece a fonte factual,
alimentada apenas por observação e reporte.

O ETA compõe três valores e expõe os três ao cliente:

    baseDurationSeconds   — tempo nominal do grafo
    currentDelaySeconds   — atraso derivado do NetworkState (fato)
    predictedDelaySeconds — atraso sugerido pelo preditor (palpite)

    appliedDelaySeconds   = max(currentDelaySeconds, predictedDelaySeconds)
    totalEstimatedSeconds = baseDurationSeconds + appliedDelaySeconds

O uso de `max` torna a previsão **conservadora**: ela só afeta o ETA quando é
*pior* que o atraso já observado. Uma previsão otimista nunca reduz um atraso
real.

## Justificativa

**Separar fato de palpite.** O NetworkState representa o estado observado da
rede e precisa continuar sendo a fonte factual. Se a inferência escrevesse ali,
um palpite viraria dado oficial — e, a partir daí, seria indistinguível de uma
observação real.

**Auditabilidade.** NetworkStateEvent funciona como trilha do que foi
registrado sobre a rede. Se a IA escrevesse nela, deixaria de ser possível
distinguir um evento observado de uma previsão. A trilha perderia justamente o
valor que a torna útil.

## Alternativas consideradas

**Preditor atualizando o NetworkState.** Rejeitada. Simplificaria o cálculo (o
ETA leria uma única fonte), mas contaminaria o estado factual com inferência e
destruiria a distinção na trilha de auditoria.

**Ignorar a previsão e usar só o atraso observado.** Rejeitada: descarta sinal
útil. O histórico frequentemente indica degradação antes que ela seja
reportada.

**Somar os dois atrasos.** Rejeitada: contaria o mesmo atraso duas vezes quando
previsão e observação concordassem, inflando o ETA sem motivo.

## Consequências

**Positivas:**
- O NetworkState continua auditável: contém apenas o que foi observado.
- **A IA pode ser desligada ou removida sem quebrar o ETA.** O sistema continua
  usando currentDelaySeconds e apenas deixa de ter predictedDelaySeconds.
- O cliente recebe a composição completa e pode explicar ao usuário de onde vem
  o tempo estimado.
- A previsão nunca torna o ETA otimista demais (max, não substituição).

**Negativas / aceitas:**
- O ETA precisa consultar duas fontes, não uma.
- A previsão não persiste: cada cálculo a refaz. Aceito — o custo é baixo e
  evita gerenciar invalidação de previsões obsoletas.

## Evidências no código

- `apps/backend/src/eta/eta.service.ts` — composição do ETA e o max
- `apps/backend/src/eta/dto/enriched-eta-response.dto.ts` — os quatro tempos
  expostos separadamente
- `apps/backend/src/ai-engine/dataset/dataset-builder.service.ts` — lê
  NetworkStateEvent; não há escrita
