# Movia — Conformidade Ley 21.719 (Chile)
## Lei de Proteção de Dados Pessoais do Chile — Vigência: 01/12/2026

---

## 1. Status Geral

| Área                        | Status              |
|-----------------------------|:-------------------:|
| Consentimento explícito     | ✅ Implementado      |
| Direito de Acesso           | ✅ Implementado      |
| Direito de Supressão        | ✅ Implementado      |
| Direito de Portabilidade    | ✅ Implementado      |
| Direito de Retificação      | ✅ Implementado      |
| Direito de Bloqueio         | ✅ Implementado      |
| Direito de Oposição         | ❌ Pendente          |
| Logs de Accountability      | ✅ Implementado      |
| Notificação de Brecha       | ✅ Runbook definido  |
| Anonimização pós-finalidade | ❌ Próxima sprint    |
| Transmissão internacional   | ⚠️ Documentada       |

---

## 2. Direitos ARCOP + Portabilidade e Bloqueio

### 2.1 Acesso (✅ Implementado)
- Endpoint: `GET /v1/privacy/export`
- Retorna: deviceId mascarado, sessões, idioma, timestamps
- Formato: JSON estruturado
- Auditoria: `PRIVACY_AUDIT export_requested` registrado em cada solicitação

### 2.2 Retificação (✅ Implementado)
- Endpoint: `PATCH /v1/privacy/language`
- Dado retificável: idioma preferido (`es-CL`, `pt-BR`, `en-US`)
- Auditoria: `PRIVACY_AUDIT language_update` registrado em cada alteração
- Nota: único dado mutável pelo titular no sistema atual

### 2.3 Cancelación/Supresión (✅ Implementado)
- Endpoint: `DELETE /v1/privacy/data`
- Remove: todas as device_sessions do dispositivo
- Auditoria: `PRIVACY_AUDIT delete_requested` + `delete_completed`
- Limitação: logs de servidor retidos por 30 dias (anonimização pendente)

### 2.4 Oposición (❌ Pendente)
- Usuário deve poder se opor ao tratamento para fins analíticos
- Pendente: mapeamento dos dados coletados para analytics antes de implementar
- Impacto: depende do escopo de coleta (crash reports vs comportamento)
- Tela: settings.tsx já tem estrutura para adicionar toggle

### 2.5 Portabilidade (✅ Implementado)
- Endpoint: `GET /v1/privacy/export` retorna JSON portável
- Pendente: formato CSV como alternativa

### 2.6 Bloqueio (✅ Implementado)
- Endpoint: `POST /v1/privacy/block` — suspende tratamento
- Endpoint: `DELETE /v1/privacy/block` — remove bloqueio
- Campo: `blocked: Boolean` em `DeviceSession`
- Resposta HTTP: `423 Locked` para sessões bloqueadas
- Base legal citada: Ley 21.719 Art. 11
- Auditoria: `PRIVACY_AUDIT block_requested` + `block_applied`

---

## 3. Minimização e Ciclo de Vida

### 3.1 Retenção (✅ Implementado)
- Sessões expiradas: removidas automaticamente a cada 24h via `CleanupService`
- Sessões revogadas: removidas após 7 dias
- Localização GPS: nunca persistida

### 3.2 Anonimização (❌ Próxima sprint)
- Hoje o sistema faz hard delete de sessões
- Para logs de servidor: anonimizar deviceId após 30 dias
- Implementar: `AnonymizationService` para substituir IDs por hash irreversível

### 3.3 Dados Sensíveis (✅ Sem coleta)
- Nenhum dado de saúde, biometria ou orientação coletado
- DeviceId é UUID v4 sem vínculo com hardware físico

---

## 4. Segurança desde o Design

### 4.1 Logs de Accountability (✅ Implementado)
- `PRIVACY_AUDIT export_requested` — toda exportação registrada
- `PRIVACY_AUDIT delete_requested` + `delete_completed` — toda exclusão registrada
- `PRIVACY_AUDIT block_requested` + `block_applied` — todo bloqueio registrado
- `PRIVACY_AUDIT language_update` — toda retificação registrada
- LoggingInterceptor: método, rota, status, latência e correlation ID em todos os endpoints

### 4.2 Notificação de Brecha (✅ Runbook definido)
- Procedimento formal em: `docs/incident-response.md`
- Classificação P0–P3 com fluxo de resposta em 6 fases
- Contato regulatório documentado: Agencia de Protección de Datos
- Prazo previsto: 24–72h conforme regulamentação da Agência
- Pendente: formalização de contratos com Sentry e Mapbox (SCCs)

### 4.3 Criptografia (✅ Implementado)
- Tokens em trânsito: HTTPS/TLS obrigatório em produção
- Refresh token: hash SHA-256 no banco
- Credenciais: variáveis de ambiente, nunca versionadas

---

## 5. Transmissão Internacional e Subprocessadores

| Serviço    | País  | Dado Transmitido         | Base Legal              |
|------------|-------|--------------------------|-------------------------|
| Sentry     | EUA   | Stack traces sem PII     | Legítimo interesse      |
| Mapbox     | EUA   | Tiles estáticos          | Execução de contrato    |
| PostgreSQL | Local | Todos os dados pessoais  | Execução de contrato    |
| Redis      | Local | Cache de sessão          | Execução de contrato    |

**Pendente:** SCCs (Standard Contractual Clauses) nos contratos com Sentry e Mapbox.

---

## 6. Risco de Sanção

| Infração                          | Classificação | Multa Máxima         |
|-----------------------------------|:-------------:|----------------------|
| Ausência de base legal            | Gravíssima    | 20.000 UTM (~$1.2M)  |
| Não notificação de brecha         | Grave         | 10.000 UTM           |
| Negação de direito ARCOP          | Grave         | 10.000 UTM           |
| Falta de medidas de segurança     | Grave         | 10.000 UTM           |
| Reincidência                      | —             | Multa triplicada      |

---

## 7. Roadmap de Conformidade

### Antes de 01/12/2026 (obrigatório)
- [x] Implementar direito de Bloqueio (`blocked` flag + endpoints POST/DELETE /privacy/block)
- [x] Implementar direito de Retificação (PATCH /privacy/language)
- [x] Adicionar logs de accountability em PrivacyService
- [x] Criar `docs/incident-response.md` com runbook de notificação
- [ ] Implementar direito de Oposição (após mapear escopo de analytics)
- [ ] Formalizar contratos com Sentry e Mapbox (SCCs)

### Recomendado (próximas sprints)
- [ ] Anonimização de logs após 30 dias (AnonymizationService)
- [ ] Exportação em formato CSV além de JSON
- [ ] DPO/Encarregado de Dados designado formalmente
- [ ] Canal dedicado para solicitações de titulares
- [ ] Testes automatizados dos fluxos de privacidade

---

## 8. Diferenças LGPD vs Ley 21.719

| Aspecto              | LGPD (Brasil)     | Ley 21.719 (Chile)          |
|----------------------|-------------------|-----------------------------|
| Direitos             | ARCO + Port.      | ARCOP + Bloqueio + Port.    |
| Multa máxima         | R$ 50M/infração   | 20.000 UTM (~$1.2M)         |
| Fiscalização         | ANPD              | Agencia de Protección        |
| Notificação brecha   | 2 dias úteis      | A ser regulamentado (24–72h) |
| Vigência             | 2020              | 01/12/2026                  |
| Dados sensíveis      | Rol definido      | Ampliado (inclui econômico)  |