# ADR-003 — Motor de rota próprio baseado em grafo

**Status:** Aceito
**Data:** registrado retroativamente em 2026-07-12

## Contexto

O Movia precisa calcular rotas no Metrô de Santiago considerando estações,
linhas, direção, baldeações, tempo estimado de viagem, tempo de caminhada em
combinação, espera estimada em baldeação e alternativas de rota.

O código modela a rede como um grafo próprio e usa algoritmo de menor caminho
para calcular a rota. A lógica de custo e a de ETA são controladas
internamente pelo projeto.

Não há, neste momento, evidência no código de que GTFS tenha sido adotado como
fonte principal do motor de rota. **A motivação histórica exata para não usar
GTFS não está registrada.**

## Decisão

Manter um motor de rota próprio baseado em grafo, em vez de depender
diretamente de GTFS como motor principal de roteamento.

O grafo próprio é a fonte operacional para cálculo de rota, custo de baldeação,
sequência de estações e alternativas. GTFS pode ser usado no futuro como fonte
auxiliar ou etapa de ingestão, mas não substitui o modelo interno sem nova
decisão arquitetural.

## Justificativa

A decisão é coerente com o estado atual do produto porque o Movia precisa
controlar regras específicas que impactam diretamente a experiência do usuário:

- custo de baldeação;
- duplicação explícita de estação na troca de linha;
- penalidade de espera;
- diferença entre rota recomendada e alternativa;
- progressão da timeline;
- cálculo de ETA exibido no app.

Essas regras são parte do comportamento de produto, não apenas dados de
transporte.

## Alternativas consideradas

### Usar GTFS diretamente

Não há registro formal de avaliação histórica.

Possíveis vantagens: aderência a um padrão de transporte público; menor
necessidade de manter dataset próprio; interoperabilidade com ferramentas
externas.

Possíveis limitações para o Movia: menor controle sobre custo de baldeação;
dificuldade de representar o comportamento visual da timeline; necessidade de
adaptar regras específicas do produto ao formato; risco de tratar dado externo
como modelo de domínio principal.

### Usar grafo próprio

Vantagens: controle total sobre regras de rota; baldeações modeladas
explicitamente; ETA e rota compartilham o mesmo modelo de custo; testes
unitários de domínio mais diretos; menos ambiguidade na timeline do app.

Desvantagens: exige manutenção do dataset; assume responsabilidade sobre a
consistência da rede; precisa de validação contínua contra a operação real.

## Consequências

**Positivas:**
- O app consegue explicar melhor a rota ao usuário.
- A estação de baldeação aparece corretamente na timeline.
- O custo de baldeação pode ser ajustado sem depender de terceiros.
- O motor de ETA compartilha a mesma lógica de custo da rota.

**Negativas:**
- O projeto assume responsabilidade pela qualidade do grafo.
- Mudanças na rede precisam ser atualizadas no dataset próprio.
- É necessário manter testes de integridade do grafo.

## Evidências no código

- `packages/route-engine` — motor de menor caminho baseado em grafo
- `eta-engine` — cálculo de ETA
- Testes de Dijkstra e de ETA
- Suporte a penalidade e espera de baldeação
- `etaBreakdown` expõe tempo de viagem, caminhada e espera

## Observação

A razão histórica original para escolher grafo próprio em vez de GTFS não está
documentada. Este ADR registra a decisão com base no estado atual do código e
do produto, **sem inventar justificativa retroativa**.
