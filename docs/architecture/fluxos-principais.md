# Fluxos principais

Como as peças se encaixam em cada operação que o usuário faz. Serve para
entender o caminho completo antes de mexer em qualquer camada isolada.

---

## 1. Abertura do app (boot)

    1. Mobile lê o deviceId do expo-secure-store.
       Se não existir, gera um UUID e guarda.
    2. POST /v1/auth/session { deviceId, language }
       → recebe access token (curto) e refresh token.
    3. Carrega estações e linhas:
       rede → grava no SQLite e no AsyncStorage
       Se a rede falhar: lê do SQLite; se vazio, do AsyncStorage.
    4. Detecta conectividade (NetInfo) e mostra banner se offline.

Se o usuário abre o app **offline logo após atualizar** e a versão do schema
do SQLite mudou, o banco local foi limpo e ainda não re-sincronizou: não
haverá dados até a primeira reconexão. Ver [ADR-002](../adr/002-offline-sqlite.md).

---

## 2. Busca de estação

    Usuário digita → useStationSearch(query)
      │
      ├─ Rede OK: GET /v1/stations?q=...
      │
      └─ Rede falha: SQLite local
           SELECT ... WHERE name_normalized LIKE ?
           A query é normalizada (minúsculas, sem acento), então
           "nuble" encontra "Ñuble" e "bio" encontra "Bío Bío".

A busca por **endereço** (Geocoding) e por **lugar** (Places) depende do
Google e não tem equivalente offline: sem rede, retorna vazio. O app prioriza
o que funciona offline — estações.

---

## 3. Cálculo de rota e ETA

    Mobile: useEta(origem, destino)
      │
      ├─ GET /v1/eta/:destino?from=:origem
      │    │
      │    Backend:
      │    1. route-engine: menor caminho no grafo
      │       (plataformas, segmentos direcionais, baldeações)
      │    2. NetworkState: atraso observado nas linhas da rota
      │    3. ai-engine: previsão derivada (EWMA, somente leitura)
      │    4. appliedDelay = max(atraso observado, atraso previsto)
      │       totalEstimated = tempo base + appliedDelay
      │    5. Resposta expõe os quatro tempos separadamente
      │
      ├─ Sucesso: grava a rota no cache (1h, por par origem-destino)
      │
      └─ Rede falha:
           ├─ Há rota em cache para este par → serve marcada como
           │   servedFromCache (pode estar desatualizada)
           └─ Não há → erro OFFLINE_NO_CACHED_ROUTE

O app **não recalcula rota offline**: isso exigiria o motor de grafo no
cliente. O que ele faz é preservar a última rota calculada — cobrindo o caso
real de calcular a rota na plataforma (com sinal) e entrar no trem (sem
sinal). Ver [ADR-002](../adr/002-offline-sqlite.md) e
[ADR-004](../adr/004-eta-preditor-read-only.md).

---

## 4. Viagem ativa

    1. Usuário confirma a rota → ActiveTripState assume o controle
    2. Fusão de localização (GPS + inercial) estima a posição
    3. tripProgress compara a posição com o path da rota
    4. A timeline avança; baldeações aparecem como troca de linha
    5. Notificação antes do destino final (se autorizada)

O acompanhamento não depende de rede: usa a rota já calculada e os sensores do
dispositivo.

---

## 5. Perda e retomada de conexão

    Online → (túnel) → Offline
      │
      ├─ Banner âmbar: "Sem conexão · Usando dados salvos"
      ├─ Buscas caem para o SQLite
      ├─ Rota ativa continua (já calculada)
      │
      └─ Reconexão
           ├─ Banner verde: "Conexão restabelecida" (3s, some sozinho)
           └─ React Query revalida os dados

O estado `unreachable` (conectado a uma rede sem internet real) é tratado como
offline. É o caso do Wi-Fi de estação com portal cativo.

---

## 6. Privacidade: exportar e apagar

    GET    /v1/privacy/export  → devolve tudo que o backend tem do deviceId
    DELETE /v1/privacy/data    → apaga
    DELETE /v1/privacy/consent → revoga consentimento

Não há PII envolvida — o que existe são sessões, consentimentos e preferências
ligadas a um UUID anônimo. Ver [ADR-005](../adr/005-privacidade-anonima.md).

---

## 7. Erro em qualquer requisição

Toda falha devolve o mesmo envelope:

    {
      "code": "NO_ROUTE_FOUND",       ← contrato: o cliente reage a isto
      "message": "...",                ← para humanos; pode mudar
      "statusCode": 404,
      "path": "/v1/eta/...",
      "timestamp": "...",
      "correlationId": "a1b2c3d4"      ← cruza com os logs do servidor
    }

O cliente decide o que fazer pelo `code`, nunca pela mensagem. Dois erros 404
diferentes ("sem rota" e "estação não encontrada") exigem reações diferentes.
Ver `apps/backend/src/common/error-codes.ts`.
