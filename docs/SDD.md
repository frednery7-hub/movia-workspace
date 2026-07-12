# SDD — Software Design Document · Movia

**Versão:** 1.0
**Data:** 2026-07-12
**Escopo:** Movia Santiago (Metrô de Santiago, Chile)

## Como ler este documento

Este SDD é um **mapa navegável**, não um manual auto-contido. O projeto já
mantém ADRs, documentos de compliance, checklists e evidência no próprio
código. Duplicar esse conteúdo aqui criaria divergência: em dois meses,
alguém atualizaria o ADR e esqueceria o SDD.

Cada seção descreve o que existe e **aponta para a fonte de verdade**. Onde
não há fonte, a seção contém a informação.

A seção 9 lista as lacunas conhecidas — o que ainda não foi feito ou não foi
validado.

---

## 1. Visão geral do sistema

O Movia planeja e acompanha viagens no Metrô de Santiago. Ele calcula a rota
entre duas estações, estima o tempo de chegada considerando o estado da rede,
e acompanha o usuário durante a viagem.

O problema central que ele resolve: **a conexão falha exatamente onde o app é
usado.** O sinal some no túnel, e o Wi-Fi das estações frequentemente conecta
sem entregar internet. Um app de metrô que só funciona online falha no momento
em que é mais necessário. Daí a arquitetura offline-first.

**Não há contas de usuário.** A identidade é um `deviceId` anônimo, sem PII.
Ver [ADR-005](adr/005-privacidade-anonima.md).

### Componentes

| Componente | Stack |
|---|---|
| `apps/backend` | NestJS 11, Prisma 5, PostgreSQL 15 |
| `apps/mobile` | Expo 52, React Native 0.76, expo-router, React Query, Zustand |
| `packages/route-engine` | Motor de rota em grafo (menor caminho) |
| `packages/geo-engine` | Cálculos geográficos e fusão de localização |
| `packages/shared-types`, `shared-data` | Contratos e dados compartilhados |
| `infra/` | Terraform (GCP), docker-compose, nginx |

Monorepo pnpm + Turbo. Node 22, pnpm 11.

---

## 2. Arquitetura

As decisões estruturais estão registradas como ADRs. Este SDD não as repete.

| Decisão | ADR |
|---|---|
| Cloud SQL como banco de produção | [ADR-001](adr/001-cloud-sql.md) |
| SQLite local para o modo offline | [ADR-002](adr/002-offline-sqlite.md) |
| Motor de rota próprio (grafo, não GTFS) | [ADR-003](adr/003-motor-de-rota-proprio.md) |
| ETA composto; preditor não escreve no NetworkState | [ADR-004](adr/004-eta-preditor-read-only.md) |
| Identidade anônima por dispositivo | [ADR-005](adr/005-privacidade-anonima.md) |
| Workload Identity Federation em vez de chaves | [ADR-006](adr/006-workload-identity-federation.md) |

### Fluxo de uma requisição

    Mobile → Cloud Run (backend) → Cloud SQL (socket Unix, IAM)
                                 → Google Places / Geocoding (timeout 3s)

O mobile mantém uma cópia local (SQLite) dos dados essenciais da rede e cai
para ela quando a rede falha.

---

## 3. Backend

**Módulos** (`apps/backend/src/`):

| Módulo | Responsabilidade |
|---|---|
| `auth` | Sessão anônima por deviceId, JWT, refresh rotacionado |
| `stations`, `lines` | Dados da rede |
| `graph` | Topologia (plataformas, segmentos, baldeações) |
| `eta` | Cálculo de rota e tempo estimado |
| `ai-engine` | Preditor EWMA (somente leitura sobre NetworkStateEvent) |
| `network-state` | Estado observado da rede + trilha de eventos |
| `search` | Estações, endereços (Geocoding) e lugares (Places) |
| `geo` | Localização e estação mais próxima |
| `privacy` | Exportação, exclusão, consentimento, bloqueio |
| `ingestion` | Entrada de dados com registro de fonte |
| `metro-incidents` | Incidentes reportados |
| `observability` | Logs (Winston), métricas (Prometheus), contexto de requisição |
| `common` | Interceptor de log, filtro de exceção, códigos de erro, cleanup |
| `health` | Liveness e readiness |

**Endpoints principais:**

    POST   /v1/auth/session          — cria sessão anônima
    POST   /v1/auth/refresh          — rotaciona o refresh token
    DELETE /v1/auth/session          — encerra sessão
    GET    /v1/auth/me               — dados da sessão

    GET    /v1/stations              — lista/busca estações
    GET    /v1/lines                 — linhas e status
    GET    /v1/eta/:destination      — rota e ETA (query: from)

    GET    /v1/network-state         — estado da rede
    GET    /v1/network-state/:lineId — estado de uma linha
    GET    /v1/network-state/:lineId/history — trilha de eventos

    POST   /v1/geo/location          — estação mais próxima

    GET    /v1/privacy/export        — exporta os dados do dispositivo
    DELETE /v1/privacy/data          — apaga os dados do dispositivo
    POST   /v1/privacy/consent       — registra consentimento
    DELETE /v1/privacy/consent       — revoga consentimento

    GET    /health, /health/live, /health/ready
    GET    /metrics                  — Prometheus (token)

**Tratamento de erro:** envelope estável com `code`, `message`, `statusCode`,
`path`, `timestamp` e `correlationId`. O cliente reage ao `code`, nunca à
mensagem. Ver `apps/backend/src/common/error-codes.ts`.

---

## 4. Mobile

**Estrutura** (`apps/mobile/src/`):

| Área | Responsabilidade |
|---|---|
| `hooks/` | Dados remotos (React Query): estações, linhas, ETA, incidentes |
| `database/` | SQLite local: schema, repositório, cascata de fallback |
| `network/` | Detecção de conectividade (3 estados) |
| `trip/` | Estado da viagem ativa e progresso |
| `sensors/` | Fusão de localização (GPS + inercial) |
| `search/` | Busca de estações, endereços e lugares |
| `poi/` | Pontos de interesse e acessos de estação |
| `privacy/` | Consentimento |
| `i18n/` | es-CL, pt-BR, en-US |

**Estratégia offline-first:** ver [ADR-002](adr/002-offline-sqlite.md).

Resumo da cascata: rede (fonte de verdade) → SQLite local → AsyncStorage
(legado). A escrita no SQLite é best-effort — um banco local corrompido não
derruba o app.

**Conectividade:** distingue `online`, `offline` e `unreachable` (conectado a
uma rede sem internet real — o caso do Wi-Fi de estação). Ver
`src/network/connectivity.ts`.

---

## 5. Dados e privacidade

Não há dados pessoais: sem conta, sem e-mail, sem nome. Ver
[ADR-005](adr/005-privacidade-anonima.md).

| Tema | Documento |
|---|---|
| Classificação dos dados | [data-classification.md](data-classification.md) |
| Compliance geral | [compliance.md](compliance.md) |
| LGPD (Brasil) | [lgpd-checklist.md](lgpd-checklist.md) |
| Ley 21.719 (Chile) | [ley-21719-compliance.md](ley-21719-compliance.md) |
| Ley 25.326 (Argentina) | [ley-25326-compliance.md](ley-25326-compliance.md) |
| Pendências de compliance | [compliance-backlog.md](compliance-backlog.md) |

**Política de privacidade pública:** https://frednery7-hub.github.io/movia-workspace/
Gerada a partir da mesma fonte i18n do app, para nunca divergir.

---

## 6. Infraestrutura

Tudo no Google Cloud, região `southamerica-east1`.

| Recurso | Uso |
|---|---|
| Cloud Run | Backend containerizado |
| Cloud SQL (PostgreSQL 15) | Banco, conectado por socket Unix + IAM |
| Secret Manager | Credenciais da aplicação |
| Artifact Registry | Imagens Docker |
| Cloud Storage | State do Terraform (criptografado, versionado) |

Infraestrutura descrita em Terraform (`infra/terraform/`), com state remoto no
GCS. Os recursos que já existiam foram reconciliados via `terraform import`.

| Tema | Documento |
|---|---|
| Deploy no Cloud Run | [deployment/cloud-run-staging.md](deployment/cloud-run-staging.md) |
| Autenticação do CI no GCP | [deployment/workload-identity-federation.md](deployment/workload-identity-federation.md) |

---

## 7. Segurança

| Tema | Documento |
|---|---|
| Riscos aceitos (com justificativa) | [security/accepted-risk.md](security/accepted-risk.md) |
| Auditoria externa (v1 e v2) | [audits/](audits/) |
| Resposta a incidentes | [incident-response.md](incident-response.md) |
| Plano de atualização de dependências | [dependency-upgrade-plan.md](dependency-upgrade-plan.md) |

**Controles em vigor:**

- JWT curto + refresh hasheado (SHA-256), rotacionado e revogável
- Tokens do mobile em `expo-secure-store`
- Validação de toda entrada (whitelist) e de todo o ambiente (Joi)
- CORS sem wildcard em produção; Helmet + HSTS
- Rate limiting por rota; purga automática de sessões
- Deploy sem chaves de longa duração (WIF)
- Container non-root; Cloud SQL sem exposição direta
- Security Gate no CI: gitleaks, audit, lint, typecheck, testes, build Docker,
  tamanho da imagem e presença de secrets

---

## 8. Build, release e QA

| Tema | Documento |
|---|---|
| Checklist de release Android | [release/android-release-checklist.md](release/android-release-checklist.md) |
| Smoke test mobile | [qa/mobile-smoke-test.md](qa/mobile-smoke-test.md) |

**Build de APK:** automatizado em `.github/workflows/build-apk.yml`. Dispara em
tags `v*` ou manualmente. O CI **falha** se o certificado do APK não bater com
o SHA-256 da keystore de produção — um APK assinado com debug nunca é
publicado.

**Testes:** 132 no backend, 157 no mobile, 14 no route-engine.

---

## 9. Lacunas abertas

Esta seção existe para ser honesta sobre o que **não** está pronto.

### Não validado em campo

- **O offline-first nunca foi testado no metrô real.** SQLite e detecção de
  conectividade foram validados apenas com testes automatizados (mocks). O
  comportamento com o Wi-Fi real de estação (portal cativo) é exatamente o tipo
  de coisa que só a validação de campo confirma.

### Decisões em aberto

- **B6 — modelo de identidade.** Qualquer `deviceId` é aceito em
  `/v1/auth/session`. Um UUID vazado permitiria consultar ou bloquear aquela
  sessão. Mitigado por rate limiting e pela ausência de PII. Um mecanismo de
  proof-of-possession resolveria. Ver [ADR-005](adr/005-privacidade-anonima.md).

### Mudanças de infra pendentes

Declaradas no Terraform, ainda não aplicadas (exigem validação, pois alteram
infraestrutura em uso):

- Service account dedicada para o Cloud Run (hoje usa a default do Compute)
- `ssl_mode = ENCRYPTED_ONLY` no Cloud SQL
- `deletion_protection = true` no Cloud SQL

### Camadas do roadmap não concluídas

Ver [roadmap/README.md](roadmap/README.md). Em aberto: polimento visual (C4),
refatoração (C9), testes adicionais (C11) e features pós-RC (C12).

### Dívida conhecida

- Endpoints com `@Roles('operator', 'admin')` são inalcançáveis: não existe
  fluxo que emita tokens com essas roles.
- 7 CVEs de tooling aceitas deliberadamente (via `tar` do `@expo/cli`), sem
  impacto em runtime. Ver [security/accepted-risk.md](security/accepted-risk.md).
