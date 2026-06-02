# Movia — Backlog de Conformidade Regulatória

Documento vivo. Atualizar após cada sprint e auditoria.
Última revisão: 2026-05-30

---

## Legenda

| Símbolo | Significado |
|:-------:|-------------|
| 🔴 | Bloqueador — necessário antes de operar na jurisdição |
| 🟠 | Alta prioridade — próxima sprint |
| 🟡 | Média prioridade — backlog planejado |
| 🟢 | Baixa prioridade — futura sprint |

---

## Chile — Ley 21.719 (vigência: 01/12/2026)

| # | Item | Prioridade | Esforço | Responsável |
|---|------|:----------:|:-------:|-------------|
| CL-01 | Implementar direito de Oposição (analytics opt-out) | 🟠 | Médio | — |
| CL-02 | Mapear escopo de dados coletados para analytics | 🟠 | Baixo | — |
| CL-03 | Formalizar SCCs com Sentry e Mapbox | 🟠 | Baixo | Jurídico |
| CL-04 | Anonimização de logs após 30 dias (AnonymizationService) | 🟡 | Médio | — |
| CL-05 | Exportação de dados em formato CSV | 🟡 | Baixo | — |
| CL-06 | Designar DPO/Encarregado formalmente | 🟡 | Baixo | RH/Jurídico |
| CL-07 | Canal dedicado para solicitações de titulares | 🟡 | Baixo | — |
| CL-08 | Testes automatizados dos fluxos de privacidade | 🟡 | Médio | — |
| CL-09 | Transparência algorítmica (quando AI Engine ativo) | 🟢 | Alto | — |

---

## Brasil — LGPD

| # | Item | Prioridade | Esforço | Responsável |
|---|------|:----------:|:-------:|-------------|
| BR-01 | Definir processo de resposta ao titular em 15 dias | 🟠 | Baixo | Operações |
| BR-02 | Canal de contato dedicado para solicitações LGPD | 🟠 | Baixo | — |
| BR-03 | Exportação de dados em formato CSV | 🟡 | Baixo | — |
| BR-04 | Testes automatizados dos fluxos de privacidade | 🟡 | Médio | — |

---

## Argentina — Ley 25.326

| # | Item | Prioridade | Esforço | Responsável |
|---|------|:----------:|:-------:|-------------|
| AR-01 | Registrar base `device_sessions` na AAIP (Art. 21) | 🔴 | Baixo | Jurídico |
| AR-02 | Definir processo de resposta ao titular em 5 dias úteis | 🔴 | Baixo | Operações |
| AR-03 | Formalizar SCCs com Sentry e Mapbox para Argentina | 🟠 | Baixo | Jurídico |
| AR-04 | Implementar direito de Oposição | 🟡 | Médio | — |
| AR-05 | Designar representante local na Argentina | 🟡 | Baixo | RH/Jurídico |

---

## Cross-jurisdicional

| # | Item | Jurisdições | Prioridade | Esforço |
|---|------|-------------|:----------:|:-------:|
| XJ-01 | Anonimização de logs após 30 dias | CL / BR / AR | 🟠 | Médio |
| XJ-02 | Canal unificado para solicitações de privacidade | CL / BR / AR | 🟠 | Baixo |
| XJ-03 | Testes automatizados de privacidade | CL / BR / AR | 🟡 | Médio |
| XJ-04 | Transparência algorítmica do AI Engine | CL / BR / AR | 🟢 | Alto |
| XJ-05 | Relatório anual de conformidade | CL / BR / AR | 🟢 | Baixo |

---

## Items Concluídos

| # | Item | Jurisdição | Concluído em |
|---|------|------------|:------------:|
| ✅ | Direito de Acesso (GET /privacy/export) | CL / BR / AR | — |
| ✅ | Direito de Supressão (DELETE /privacy/data) | CL / BR / AR | — |
| ✅ | Direito de Portabilidade (JSON export) | CL / BR | — |
| ✅ | Direito de Retificação (PATCH /privacy/language) | CL / BR / AR | — |
| ✅ | Direito de Bloqueio (POST/DELETE /privacy/block) | CL | — |
| ✅ | Logs de accountability (PRIVACY_AUDIT) | CL / BR / AR | — |
| ✅ | Runbook de resposta a incidentes | CL / BR / AR | — |
| ✅ | Notificação de brecha — Chile, Brasil, Argentina | CL / BR / AR | 2026-05-30 |
| ✅ | Minimização de dados (GPS não persistido) | CL / BR / AR | — |
| ✅ | Retenção automática (CleanupService) | CL / BR / AR | — |
| ✅ | Rate limiting global | CL / BR / AR | — |
| ✅ | JWT obrigatório com expiração | CL / BR / AR | — |
---

## Módulo 3 — Ingestion Pipeline

| # | Item | Prioridade | Esforço |
|---|------|:----------:|:-------:|
| M3-R1 | Validar URLs do Source Registry: HTTPS obrigatório, bloquear localhost/IPs privados | 🟠 | Baixo |
| M3-R2 | Autenticidade da fonte: API Key / OAuth / mTLS por fornecedor GTFS | 🟠 | Médio |
| M3-R3 | Métricas de ingestão: ingestion_events_total, rejected_total, duration_ms | 🟡 | Médio |