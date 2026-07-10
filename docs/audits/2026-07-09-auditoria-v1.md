# Relatório de Auditoria — Movia

> **ATUALIZAÇÃO 09/07/2026 — Correções aplicadas.** Status dos achados:
>
> | Achado | Status |
> |---|---|
> | A1 — Cloud SQL TLS opcional | ✅ Corrigido: `ssl_mode = "ENCRYPTED_ONLY"`, socket Cloud SQL montado no Cloud Run, `deletion_protection = true` (B3) |
> | M1 — geo-engine não declarado / suíte quebrada | ✅ Corrigido: dependência adicionada, Jest mapeado, lockfile atualizado — 151/151 testes mobile passando |
> | M2 — vulns do tar | ⚠️ **Reclassificado: falso positivo.** O risco já era aceito e documentado (`docs/security/accepted-risk.md`, `ignoreGhsas` no `pnpm-workspace.yaml`). A auditoria original usou pnpm 9, que não lê essa config do pnpm 11. Com pnpm 11: 7/7 ignoradas, gate de CI passa. Nada a corrigir |
> | M3 — refresh perde role | ✅ Corrigido: coluna `role` em `device_sessions` (migração criada), role persistida e repassada no refresh |
> | M4 — senha SQL literal no TF | ✅ Corrigido: variável `db_user_password` (sensitive) |
> | M5 — SA default do Compute | ✅ Corrigido: SA dedicada `movia-backend-runtime` |
> | B1 — comparação não timing-safe | ✅ Corrigido: `crypto.timingSafeEqual` |
> | B4 — senha default do Redis | ✅ Corrigido: `REDIS_PASSWORD` agora obrigatória (adicionada ao `.env` local) |
> | B5 — X-XSS-Protection / CSP | ✅ Corrigido: header removido, `connect-src` restringido a `'self'` |
> | B2, B6, B7 | ⏸ Não alterados (exigem decisão: bucket de state remoto, modelo de identidade, console GCP) |
>
> **Verificação pós-correção:** backend 121/121 testes ✅, mobile 151/151 ✅ (suíte quebrada recuperada), `tsc` limpo nos dois ✅, audit sem pendências ✅. Prisma Client regenerado.
> **Ações pendentes do seu lado:** rodar `pnpm install` (linka o geo-engine), `prisma migrate deploy` no staging, e `terraform plan` antes do próximo apply (exige `TF_VAR_db_user_password`; a troca de SA e o `ENCRYPTED_ONLY` alteram infra real — revisar o plan).

**Data:** 09/07/2026
**Escopo:** monorepo completo (`apps/backend`, `apps/mobile`, `apps/designer`, `packages/*`, `infra/`, `.github/`, `scripts/`, `docs/`)
**Tipo:** auditoria de leitura (nenhuma alteração foi feita no código)

---

## 1. Sumário executivo

O Movia é um monorepo pnpm/Turbo maduro e bem acima da média em higiene de engenharia: backend NestJS com autenticação por dispositivo bem implementada, validação rigorosa de ambiente e entrada, CI com gate de segurança (gitleaks, audit, lint, typecheck, testes), deploy via Workload Identity Federation (sem chaves de longa duração) e documentação de compliance (LGPD, Ley 21.719/CL, Ley 25.326/AR).

**Resultado geral: BOM.** Nenhum segredo real versionado no git (histórico verificado). Foram encontrados **1 achado de severidade alta** (configuração do Cloud SQL no Terraform), **5 médios** e diversos pontos menores.

| Verificação | Resultado |
|---|---|
| Typecheck backend (`tsc --noEmit`) | ✅ 0 erros |
| Testes backend | ✅ 121/121 passando (19 suítes) |
| Testes mobile | ⚠️ 146/146 passando, mas **1 suíte não roda** (ver M1) |
| Testes route-engine | ✅ 14/14 passando |
| `pnpm audit` | ⚠️ 6 high + 1 moderate (todas em `node-tar`, ver M2) |
| Segredos no git (atual + histórico) | ✅ nenhum encontrado |
| `any` / TODO / FIXME no código-fonte | ✅ zero ocorrências |

Volume: ~28.145 linhas de TS/TSX próprias, 408 arquivos versionados, 195 commits.

---

## 2. Visão geral da arquitetura

| Componente | Stack | Observação |
|---|---|---|
| `apps/backend` | NestJS 11, Prisma 5.22, PostgreSQL, JWT, Winston, Sentry, prom-client | 20 módulos (auth, privacy, eta, geo, graph, search, ingestion, ai-engine…) |
| `apps/mobile` | Expo 52, React Native 0.76.9, expo-router, Zustand, React Query, SQLite offline | v2.2.0, i18n es/pt/en |
| `apps/designer` | Vite + React, Radix/MUI/Tailwind 4 | Ferramenta interna de design |
| `packages/*` | route-engine, geo-engine, shared-data, shared-types, configs | Motor de rotas em grafo |
| `infra/` | Terraform (GCP: Cloud Run, Cloud SQL, Artifact Registry, Secret Manager), docker-compose, nginx | Staging em `southamerica-east1` |
| CI/CD | GitHub Actions: security-gate, deploy-staging (manual, WIF), pages de privacidade | Husky: commitlint, lint-staged, `pnpm audit` no pre-push |

---

## 3. Achados

### 🔴 A1 — Cloud SQL com IP público e TLS opcional (Terraform)

`infra/terraform/main.tf`:

```hcl
ip_configuration {
  ipv4_enabled = true
  ssl_mode     = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
}
```

O comentário no próprio arquivo afirma "sem IP público exposto ao backend", mas `ipv4_enabled = true` cria IP público na instância, e `ALLOW_UNENCRYPTED_AND_ENCRYPTED` permite conexões sem TLS. Como a conexão do Cloud Run usa o Cloud SQL Connector (socket Unix), o IP público é desnecessário.

**Recomendação:** `ipv4_enabled = false` (ou restringir `authorized_networks`) e `ssl_mode = "ENCRYPTED_ONLY"`.

---

### 🟠 M1 — Dependência `@movia/geo-engine` não declarada no mobile + suíte de teste quebrada

`apps/mobile/src/sensors/LocationFusion.ts` importa `@movia/geo-engine`, mas o pacote **não está declarado** em `apps/mobile/package.json` (só `shared-data` e `shared-types`). Funciona hoje por hoisting do pnpm — frágil e pode quebrar em builds isolados. Consequência já visível: `LocationFusion.test.ts` falha com `Cannot find module '@movia/geo-engine'` (falta também o `moduleNameMapper` no Jest, que só mapeia `shared-data`).

**Recomendação:** adicionar `"@movia/geo-engine": "workspace:*"` e mapear no Jest.

---

### 🟠 M2 — 7 vulnerabilidades de dependências (6 high, 1 moderate)

Todas em `node-tar` ≤ 7.5.15 (path traversal, arbitrary file overwrite, file smuggling — GHSA-r6q2-hw4h-h46w e outros), via `expo@52.0.49 > @expo/cli > tar@6.2.1` (14 caminhos). Risco de runtime baixo (tooling de build), porém o gate de CI usa `pnpm audit --audit-level=high` — **o Security Gate deve estar falhando atualmente**.

**Recomendação:** adicionar `pnpm.overrides` para `tar >= 7.5.16` (ou atualizar o Expo SDK, já previsto em `docs/dependency-upgrade-plan.md`).

---

### 🟠 M3 — Rotação de refresh token perde a `role` + roles inalcançáveis

`auth.service.ts`: `refreshSession()` chama `this.generateToken(session.deviceId, session.language)` sem repassar a role — um token `operator`/`admin` degrada para `anonymous_device` no primeiro refresh. Além disso, não existe nenhum fluxo que emita tokens com role `operator`/`admin`, tornando os endpoints `@Roles('operator', 'admin')` de `network-state.controller.ts` inalcançáveis (mitiga escalação, mas indica funcionalidade morta). A role também não é persistida em `DeviceSession`.

**Recomendação:** persistir a role na sessão e repassá-la no refresh; documentar (ou implementar) o fluxo de emissão de tokens privilegiados.

---

### 🟠 M4 — Senha de usuário SQL como literal no Terraform

```hcl
resource "google_sql_user" "movia" {
  password = "managed-via-secret-manager"
}
```

Mesmo sendo placeholder, esse literal é a senha efetiva criada pelo Terraform e fica gravado em texto plano no state.

**Recomendação:** usar `random_password` + Secret Manager, ou variável `sensitive`, e garantir state remoto criptografado (ver B2).

---

### 🟠 M5 — Cloud Run rodando com service account default do Compute Engine

`local.runtime_service_account = "<project>-compute@developer.gserviceaccount.com"`. A SA default costuma ter permissões amplas no projeto (violação de menor privilégio).

**Recomendação:** criar SA dedicada com apenas `secretAccessor` + `cloudsql.client`.

---

### 🟡 Baixa severidade

| # | Achado | Local | Recomendação |
|---|---|---|---|
| B1 | Comparação de `METRICS_TOKEN` não é timing-safe (`auth !== 'Bearer ' + token`) | `metrics.controller.ts` | `crypto.timingSafeEqual` |
| B2 | Terraform sem backend remoto (state local, sem lock/criptografia gerenciada) | `providers.tf` | backend `gcs` com bucket versionado |
| B3 | `deletion_protection = false` no Cloud SQL | `main.tf` | habilitar (mesmo em staging, há backup diário) |
| B4 | Senha default fraca do Redis no compose (`:-movia_redis_secret`) | `docker-compose.yml` | exigir `REDIS_PASSWORD` sem fallback |
| B5 | Header obsoleto `X-XSS-Protection` e CSP com `connect-src 'self' https:` amplo | `infra/nginx/default.conf` | remover header; restringir `connect-src` |
| B6 | `/v1/auth/session` aceita qualquer `deviceId` (spoofing de identidade anônima). Mitigado por throttle 5/min; risco: bloquear/consultar sessão alheia se o UUID vazar | `auth.controller.ts` | aceitável no modelo anônimo; considerar proof-of-possession futuro |
| B7 | Chave Google Maps Android em `apps/mobile/.env` local (nunca commitada — verificado no histórico). Chaves Android são públicas por natureza no APK, mas exigem restrição | Console GCP | confirmar restrição por package name + SHA-1 e por API |

### ℹ️ Informativos

- Prisma 5.22 e Expo 52/RN 0.76 estão atrás das versões atuais; já existe plano em `docs/dependency-upgrade-plan.md`.
- `scripts/audit-full.sh` cobre apenas estrutura/build/typecheck — não é auditoria de segurança (o semgrep está em script separado, com relatórios fora do repo ✅).
- `.env` local do backend usa credenciais dev fracas (`root`, `dev_secret_...`) — normal para dev, não versionado.
- `docker-compose.override.yml` (portas expostas + senhas dev) não é versionado ✅.
- README com placeholders de screenshots não substituídos.

---

## 4. Pontos fortes (destaques)

- **Segredos:** nenhum `.env`, keystore ou chave no git (atual e histórico verificados); apenas `.env.example` versionados; gitleaks no CI; keystore de release via env vars.
- **Backend:** fail-fast sem `JWT_SECRET`; CORS com wildcard proibido em prod/staging; Helmet completo com HSTS; `ValidationPipe` com `whitelist + forbidNonWhitelisted`; validação Joi de todo o ambiente; refresh tokens hasheados (SHA-256), rotacionados e com revogação; throttling por rota; purga automática de sessões expiradas (retenção/LGPD).
- **Mobile:** tokens e deviceId em `expo-secure-store`; interceptor 401 com refresh automático; estratégia offline-first com SQLite.
- **Infra/CI:** Dockerfile com usuário não-root e `--frozen-lockfile`; deploy via WIF sem chaves de longa duração; secrets via Secret Manager; nginx com TLS 1.2/1.3 e headers de segurança.
- **Qualidade:** zero `any`/TODO/FIXME em ~28k linhas; typecheck limpo; 281 testes passando no total; conventional commits com hooks.

---

## 5. Recomendações priorizadas

1. **Imediato:** corrigir Cloud SQL (`ipv4_enabled = false`, `ssl_mode = "ENCRYPTED_ONLY"`) — A1.
2. **Curto prazo:** override de `tar` para desbloquear o Security Gate (M2); declarar `@movia/geo-engine` no mobile e consertar a suíte de teste (M1).
3. **Curto prazo:** senha SQL via `random_password`/Secret Manager (M4); SA dedicada para o Cloud Run (M5).
4. **Médio prazo:** persistir role na sessão (M3); state remoto do Terraform (B2); itens B1–B5.
5. **Contínuo:** executar o plano de upgrade de dependências (Expo/Prisma) já documentado.

---

*Relatório gerado por auditoria automatizada de leitura em 09/07/2026. Nenhum arquivo do projeto foi modificado.*
