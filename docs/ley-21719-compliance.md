# Movia — Conformidade Ley 21.719 (Chile)
## Lei de Proteção de Dados Pessoais do Chile — Vigência: 01/12/2026

---

## 1. Status Geral

| Área                        | Status         |
|-----------------------------|:--------------:|
| Consentimento explícito     | ✅ Implementado |
| Direito de Acesso           | ✅ Implementado |
| Direito de Supressão        | ✅ Implementado |
| Direito de Portabilidade    | ✅ Implementado |
| Direito de Retificação      | ❌ Pendente     |
| Direito de Bloqueio         | ❌ Pendente     |
| Direito de Oposição         | ❌ Pendente     |
| Logs de Accountability      | ⚠️ Parcial      |
| Notificação de Brecha       | ❌ Pendente     |
| Anonimização pós-finalidade | ❌ Pendente     |
| Transmissão internacional   | ⚠️ Documentada  |

---

## 2. Direitos ARCOP + Portabilidade e Bloqueio

### 2.1 Acesso (✅ Implementado)
- Endpoint: `GET /v1/privacy/export`
- Retorna: deviceId mascarado, sessões, idioma, timestamps
- Formato: JSON estruturado

### 2.2 Retificação (❌ Pendente)
- O sistema atual não permite atualizar idioma via endpoint dedicado
- Necessário: `PATCH /v1/user/language`
- Impacto: baixo (único dado mutável é o idioma preferido)

### 2.3 Cancelación/Supresión (✅ Implementado)
- Endpoint: `DELETE /v1/privacy/data`
- Remove: todas as device_sessions do dispositivo
- Limitação: não remove logs de servidor (retidos por 30 dias)
- Pendente: anonimização de logs em vez de deleção

### 2.4 Oposición (❌ Pendente)
- Usuário deve poder se opor ao tratamento para fins analíticos
- Implementar: campo `analyticsOptOut` no consentimento
- Tela: settings.tsx já tem estrutura para adicionar toggle

### 2.5 Portabilidade (✅ Implementado)
- Endpoint: `GET /v1/privacy/export` retorna JSON portável
- Pendente: formato CSV como alternativa

### 2.6 Bloqueio (❌ Pendente)
- Novo direito na lei chilena — suspender tratamento durante disputa
- Necessário: campo `blocked: Boolean` em `DeviceSession`
- Lógica: se `blocked = true`, rejeitar novas sessões com `423 Locked`
- Migração Prisma necessária

---

## 3. Minimização e Ciclo de Vida

### 3.1 Retenção (✅ Implementado)
- Sessões expiradas: removidas automaticamente a cada 24h via `CleanupService`
- Sessões revogadas: removidas após 7 dias
- Localização GPS: nunca persistida

### 3.2 Anonimização (❌ Pendente)
- Hoje o sistema faz hard delete de sessões
- Para logs de servidor: anonimizar deviceId após 30 dias
- Implementar: `AnonymizationService` para substituir IDs por hash irreversível

### 3.3 Dados Sensíveis (✅ Sem coleta)
- Nenhum dado de saúde, biometria ou orientação coletado
- DeviceId é UUID v4 sem vínculo com hardware físico

---

## 4. Segurança desde o Design

### 4.1 Logs de Accountability (⚠️ Parcial)
- LoggingInterceptor: registra método, rota, status, latência e correlation ID
- Faltante: log específico de acesso a dados pessoais (export/delete)
- Implementar: auditoria em `PrivacyService` para registrar quem solicitou e quando

### 4.2 Notificação de Brecha (❌ Pendente)
- Sentry está configurado para detecção de erros
- Faltante: protocolo formal de notificação à Agencia de Protección de Datos
- Prazo legal: a ser definido pela Agência (previsto entre 24h e 72h)
- Implementar: runbook em `docs/incident-response.md`

### 4.3 Criptografia (✅ Implementado)
- Tokens em trânsito: HTTPS/TLS obrigatório em produção
- Refresh token: hash SHA-256 no banco
- Credenciais: variáveis de ambiente, nunca versionadas

---

## 5. Transmissão Internacional e Subprocessadores

| Serviço  | País     | Dado Transmitido         | Base Legal              |
|----------|----------|--------------------------|-------------------------|
| Sentry   | EUA      | Stack traces sem PII     | Legítimo interesse      |
| Mapbox   | EUA      | Tiles estáticos          | Execução de contrato    |
| PostgreSQL | Local  | Todos os dados pessoais  | Execução de contrato    |
| Redis    | Local    | Cache de sessão          | Execução de contrato    |

**Nota:** Transmissões para EUA requerem garantias adequadas sob Ley 21.719.
Recomendado: incluir cláusulas contratuais padrão (SCCs) nos contratos com Sentry e Mapbox.

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
- [ ] Implementar direito de Bloqueio (`blocked` flag + endpoint)
- [ ] Implementar direito de Oposição (toggle analytics)
- [ ] Implementar direito de Retificação (PATCH idioma)
- [ ] Criar `docs/incident-response.md`
- [ ] Adicionar log de accountability em PrivacyService
- [ ] Formalizar contratos com Sentry e Mapbox (SCCs)

### Recomendado (boas práticas)
- [ ] Anonimização de logs após 30 dias
- [ ] Exportação em formato CSV além de JSON
- [ ] DPO/Encarregado de Dados designado formalmente
- [ ] Canal dedicado para solicitações de titulares
- [ ] Testes automatizados dos fluxos de privacidade

---

## 8. Diferenças LGPD vs Ley 21.719

| Aspecto              | LGPD (Brasil)     | Ley 21.719 (Chile)         |
|----------------------|-------------------|----------------------------|
| Direitos             | ARCO + Port.      | ARCOP + Bloqueio + Port.   |
| Multa máxima         | R$ 50M/infração   | 20.000 UTM (~$1.2M)        |
| Fiscalização         | ANPD              | Agencia de Protección       |
| Notificação brecha   | 2 dias úteis      | A ser regulamentado         |
| Vigência             | 2020              | 01/12/2026                 |
| Dados sensíveis      | Rol definido      | Ampliado (inclui econômico) |