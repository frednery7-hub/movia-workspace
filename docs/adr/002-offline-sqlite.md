# ADR-002 — SQLite local para o modo offline

**Status:** Aceito
**Data:** 2026-07-10

## Contexto

O Movia é usado exatamente onde a conexão falha: dentro do metrô. O sinal
some no túnel, e o Wi-Fi das estações frequentemente "conecta" sem entregar
internet de verdade. Um app de navegação de metrô que só funciona online
falha no momento em que é mais necessário.

O app já tinha um cache em `AsyncStorage` (chave-valor, com TTL), suficiente
para guardar a lista de estações, mas não para consultá-la: buscar uma
estação exigia carregar as 126 na memória e filtrar em JavaScript.

## Decisão

Usar **`expo-sqlite`** como banco local para os dados essenciais da rede
(linhas, estações e a relação entre elas), com uma cascata de resiliência:

1. Rede (fonte de verdade) — grava no SQLite e no AsyncStorage
2. SQLite — sobrevive à expiração do cache, permite consulta SQL
3. AsyncStorage — fallback legado, mantido por compatibilidade

A escrita no SQLite é *best-effort*: se falhar, o app continua com os dados
da rede. Um banco local corrompido não pode derrubar a funcionalidade
principal.

## Alternativas consideradas

**Expandir o AsyncStorage.** Rejeitada. Funcionaria hoje — o volume é
pequeno (126 estações, ~10MB no servidor) —, mas é chave-valor: toda busca
vira "carregar tudo e filtrar em JS". Não escala para mais cidades (Movia
Brasil) nem para consultas espaciais ("estações num raio de 500m").

**Recalcular rotas offline.** Rejeitada *neste escopo*. Exigiria portar o
motor de grafo para o cliente e replicar a topologia completa (plataformas,
segmentos, tempos) no SQLite. É uma feature à parte, não um fallback. O que
se faz hoje é servir a última rota calculada para o mesmo par
origem-destino, marcada como vinda do cache.

## Consequências

**Positivas:**
- Busca de estação funciona sem internet, com SQL e índice — inclusive com
  normalização de acentos ("nuble" encontra "Ñuble").
- O caminho para mais dados offline (topologia, POIs) já está aberto.
- Os dados sobrevivem à limpeza do cache do sistema.

**Negativas / aceitas:**
- Mais uma dependência nativa (`expo-sqlite`), que exige build nativo — não
  funciona no Expo Go.
- O schema tem versão: uma mudança de schema apaga e re-sincroniza o banco
  local. Um usuário que atualize o app e abra **offline** ficará sem dados
  até reconectar uma vez. Aceito porque os dados de rede não são pessoais e
  voltam na primeira conexão.
