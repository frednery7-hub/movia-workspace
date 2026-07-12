# Logs e observabilidade

Como o backend registra o que acontece, e como usar isso para investigar um
problema.

---

## Formato

Todo log é **JSON estruturado** (Winston), com timestamp e stack de erro
quando houver. Em produção o nível é `info`; em desenvolvimento, `debug`.

Exemplo de uma requisição bem-sucedida:

    {
      "level": "info",
      "message": "http_request",
      "correlationId": "a1b2c3d4e5f6a7b8",
      "method": "GET",
      "route": "/v1/eta/:destination",
      "statusCode": 200,
      "durationMs": 87,
      "timestamp": "2026-07-12T15:04:05.123Z"
    }

---

## correlationId — o ponto central

Cada requisição recebe um `correlationId` único, gerado no
`LoggingInterceptor`. Ele:

1. é injetado **automaticamente em todo log** emitido durante aquela
   requisição — inclusive nos logs de services e repositories, que não têm
   acesso ao objeto Request;
2. volta ao cliente no header `x-correlation-id`;
3. aparece no envelope de erro, para que o usuário possa citá-lo.

Isso é o que transforma "logs estruturados" em **logs rastreáveis**: filtrar
por um `correlationId` mostra tudo que aconteceu naquela chamada, de ponta a
ponta.

A propagação usa `AsyncLocalStorage` (API nativa do Node), que sobrevive a
`await` sem precisar passar o contexto por parâmetro em cada função. Ver
`apps/backend/src/observability/context/request-context.ts`.

### Investigando um problema reportado

    1. O usuário informa o correlationId que apareceu no erro.
    2. No Cloud Logging, filtre por ele.
    3. Você vê a requisição inteira: entrada, o que cada camada fez,
       o erro e o stack.

---

## Eventos classificados

O `GlobalExceptionFilter` separa os eventos por natureza, não apenas por
status:

| Evento | Quando |
|---|---|
| `http_request` | Requisição concluída |
| `http_request_error` | Falha (5xx como `error`, 4xx como `warn`) |
| `http_exception` | Exceção capturada pelo filtro |
| `security_event` | 401 e 403 — também incrementa métrica de auth |
| `rate_limit_event` | 429 |
| `sensitive_bad_request` | 400 em rota sensível (`/auth/`, `/geo/`, `/eta/`) |

Erros 5xx também vão para o Sentry.

---

## Destinos

**Console (stdout).** Sempre. É o que o Cloud Logging captura no Cloud Run.

**Arquivos** (`logs/app.log`, `logs/security.log`). Apenas se
`LOG_TO_FILES=true`.

Eles são **desligados por padrão** porque no Cloud Run o filesystem é efêmero:
os arquivos somem a cada restart e o Cloud Logging já pega o stdout — escrever
em disco lá consome espaço sem entregar nada. A opção existe para ambientes com
disco persistente (VM, on-premise), onde a rotação faz sentido.

---

## Métricas

Prometheus, via `prom-client`, expostas em `GET /metrics` (protegido por
token, comparado de forma timing-safe).

- `httpRequestDuration` — duração por método, rota e status
- `authFailuresTotal` — falhas de autenticação por tipo

---

## O que NÃO é logado

Não há PII para vazar nos logs, porque não há PII no sistema. O que aparece:
`deviceId` (UUID anônimo), rota, status, duração, IP e user-agent.

Consultas sensíveis são registradas com identificadores resumidos, não com o
conteúdo da busca.
