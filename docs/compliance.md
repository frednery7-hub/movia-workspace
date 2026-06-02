# Movia — Compliance Corporativo

## 1. Matriz de Permissões por Perfil

| Recurso                          | anonymous_device | user | operator | admin | ai_engine |
|----------------------------------|:----------------:|:----:|:--------:|:-----:|:---------:|
| POST /auth/session               | ✅               | ✅   | ✅       | ✅    | —         |
| POST /auth/refresh               | ✅               | ✅   | ✅       | ✅    | —         |
| DELETE /auth/session             | ✅               | ✅   | ✅       | ✅    | —         |
| GET /auth/me                     | ✅               | ✅   | ✅       | ✅    | —         |
| GET /lines                       | ✅               | ✅   | ✅       | ✅    | —         |
| GET /eta/:id                     | ✅               | ✅   | ✅       | ✅    | —         |
| POST /geo/location               | ✅               | ✅   | ✅       | ✅    | —         |
| GET /privacy/export              | ✅               | ✅   | ✅       | ✅    | —         |
| DELETE /privacy/data             | ✅               | ✅   | ✅       | ✅    | —         |
| PATCH /privacy/language          | ✅               | ✅   | ✅       | ✅    | —         |
| POST /privacy/block              | ✅               | ✅   | ✅       | ✅    | —         |
| DELETE /privacy/block            | ✅               | ✅   | ✅       | ✅    | —         |
| GET /health/*                    | ✅               | ✅   | ✅       | ✅    | —         |
| GET /network-state               | —                | —    | ✅       | ✅    | —         |
| GET /network-state/:lineId       | —                | —    | ✅       | ✅    | —         |
| PUT /network-state/:lineId       | —                | —    | ✅       | ✅    | (via DI)  |
| GET /network-state/:lineId/history | —              | —    | ✅       | ✅    | —         |

**Nota ai_engine:** não acessa endpoints HTTP. Interage com
`NetworkStateService` diretamente via injeção de dependência (DI)
no mesmo processo Node.js.

---

## 2. Política de Sessão

- Access token: 24h
- Refresh token: 7 dias com rotação obrigatória
- Revogação imediata via `DELETE /auth/session`
- Máximo 5 sessões criadas por minuto por IP
- Sessões expiradas removidas automaticamente a cada 24h
- Sessões bloqueadas (`blocked: true`): tratamento suspenso conforme
  Ley 21.719 Art. 11 e equivalentes

---

## 3. Política de Retenção

| Dado                   | Retenção        | Justificativa              |
|------------------------|-----------------|----------------------------|
| device_sessions        | 7 dias          | Duração do refresh token   |
| Sessões revogadas      | 7 dias          | Auditoria mínima           |
| Localização            | Não persistida  | Minimização LGPD           |
| Logs de aplicação      | 30 dias         | Diagnóstico operacional    |
| Logs de segurança      | 90 dias         | Resposta a incidentes      |
| NetworkStateEvent      | Indefinido      | Auditoria operacional + IA |

---

## 4. Política de Backup

- Banco PostgreSQL: backup diário automatizado via pg_dump
- Retenção de backups: 30 dias
- Restore testado mensalmente
- Backups armazenados em local separado do servidor principal

---

## 5. Registro de Acesso Administrativo

- Todos os acessos administrativos registrados via LoggingInterceptor
- Correlation ID único por request
- Logs estruturados com timestamp, método, rota e status
- Logs de segurança separados dos logs de aplicação

---

## 6. Trilha de Auditoria

| Evento                       | Mecanismo                              |
|------------------------------|----------------------------------------|
| Criação de sessão            | Tabela device_sessions                 |
| Revogação de sessão          | Campo revoked + updatedAt              |
| Exportação de dados          | PRIVACY_AUDIT export_requested         |
| Exclusão de dados            | PRIVACY_AUDIT delete_requested/completed|
| Bloqueio de dispositivo      | PRIVACY_AUDIT block_requested/applied  |
| Retificação de idioma        | PRIVACY_AUDIT language_update          |
| Atualização de NetworkState  | NETWORK_STATE_UPDATE + NetworkStateEvent|
| Fallback de NetworkState     | NETWORK_STATE_EMPTY_FALLBACK (warn)    |
| Build do grafo               | GRAPH_BUILD_OK / GRAPH_INTEGRITY_FAIL  |
| Limpeza de dados             | CleanupService logger                  |

---

## 7. Política de Resposta a Incidentes

Procedimento completo em `docs/incident-response.md`.

Resumo executivo:

| Fase        | Prazo      | Ação principal                        |
|-------------|------------|---------------------------------------|
| Detecção    | 0–1h       | Classificar P0/P1/P2/P3               |
| Contenção   | 1–4h       | Revogar sessões, rotacionar segredos  |
| Análise     | 4–24h      | Mapear dados expostos                 |
| Notificação | 24–72h     | Chile (Agencia) + Brasil (ANPD) + Argentina (AAIP) |
| Recuperação | 24–72h     | Deploy corrigido + monitoramento      |
| Pós-incidente| 5 dias úteis| RCA + relatório regulatório          |

---

## 8. Cobertura Regulatória

| Jurisdição  | Lei          | Status        | Vigência      |
|-------------|--------------|:-------------:|---------------|
| Chile       | Ley 21.719   | ⚠️ Em progresso| 01/12/2026    |
| Brasil      | LGPD         | ✅ Adequado    | 2020          |
| Argentina   | Ley 25.326   | ⚠️ Em progresso| 2000          |

Detalhes por jurisdição:
- `docs/ley-21719-compliance.md`
- `docs/lgpd-checklist.md`
- `docs/ley-25326-compliance.md`