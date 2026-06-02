# Movia — Conformidade Ley 25.326 (Argentina)
## Lei de Proteção de Dados Pessoais da Argentina — Em vigor desde 2000

---

## 1. Status Geral

| Área                        | Status              |
|-----------------------------|:-------------------:|
| Consentimento explícito     | ✅ Implementado      |
| Direito de Acesso           | ✅ Implementado      |
| Direito de Retificação      | ✅ Implementado      |
| Direito de Supressão        | ✅ Implementado      |
| Direito de Oposição         | ❌ Pendente          |
| Logs de Accountability      | ✅ Implementado      |
| Notificação de Brecha       | ✅ Runbook definido  |
| Prazo de resposta ao titular| ❌ Processo pendente |
| Transmissão internacional   | ⚠️ Documentada       |

---

## 2. Direitos do Titular (Arts. 14–19)

### 2.1 Acesso — Art. 14 (✅ Implementado)
- Endpoint: `GET /v1/privacy/export`
- Prazo legal: resposta gratuita a cada 6 meses ou quando houver
  interesse legítimo
- Retorna: deviceId mascarado, sessões, idioma, timestamps
- Auditoria: `PRIVACY_AUDIT export_requested` registrado

### 2.2 Retificação — Art. 16 (✅ Implementado)
- Endpoint: `PATCH /v1/privacy/language`
- Prazo legal: 5 dias úteis após solicitação
- Dado retificável: idioma preferido
- Auditoria: `PRIVACY_AUDIT language_update` registrado

### 2.3 Supressão — Art. 16 (✅ Implementado)
- Endpoint: `DELETE /v1/privacy/data`
- Prazo legal: 5 dias úteis após solicitação
- Remove: todas as device_sessions do dispositivo
- Auditoria: `PRIVACY_AUDIT delete_requested` + `delete_completed`

### 2.4 Oposição — Art. 27 (❌ Pendente)
- Titular pode se opor ao tratamento para fins de publicidade ou
  pesquisa de mercado
- Pendente: mapeamento do escopo de analytics antes de implementar
- Impacto estimado: baixo (sistema não realiza marketing direto)

---

## 3. Registro de Bases de Dados — Art. 21

A Ley 25.326 exige registro de bases de dados pessoais perante
a **Agencia de Acceso a la Información Pública (AAIP)**.

| Base de dados    | Registro AAIP | Situação       |
|------------------|:-------------:|----------------|
| device_sessions  | Necessário    | ❌ Pendente     |

**Ação necessária:** registrar o banco `device_sessions` na AAIP antes
de operar com usuários argentinos em produção.

---

## 4. Prazos de Resposta ao Titular

| Direito       | Prazo Legal     | Situação atual          |
|---------------|:---------------:|-------------------------|
| Acesso        | Grátis / 6 meses| ⚠️ Processo manual       |
| Retificação   | 5 dias úteis    | ⚠️ Processo manual       |
| Supressão     | 5 dias úteis    | ⚠️ Processo manual       |
| Oposição      | 5 dias úteis    | ❌ Não implementado       |

**Pendente:** definir processo operacional de triagem e resposta
para solicitações de titulares argentinos dentro dos prazos legais.

---

## 5. Minimização e Ciclo de Vida

### 5.1 Retenção (✅ Adequado)
- Sessões expiradas: removidas a cada 24h
- Sessões revogadas: removidas após 7 dias
- Localização GPS: nunca persistida

### 5.2 Dados Sensíveis (✅ Sem coleta)
- Art. 7 proíbe tratamento de dados sensíveis sem consentimento
  explícito e finalidade específica
- O Movia não coleta saúde, biometria, religião, opinião política
  ou orientação sexual

---

## 6. Transmissão Internacional — Art. 12

A Ley 25.326 restringe transferência internacional a países que
ofereçam nível de proteção adequado.

| Serviço    | País  | Adequação AAIP | Ação necessária          |
|------------|-------|:--------------:|--------------------------|
| Sentry     | EUA   | ⚠️ Não listado  | Cláusulas contratuais    |
| Mapbox     | EUA   | ⚠️ Não listado  | Cláusulas contratuais    |
| PostgreSQL | Local | ✅ N/A          | —                        |
| Redis      | Local | ✅ N/A          | —                        |

---

## 7. Notificação de Brecha

- Runbook em: `docs/incident-response.md`
- Autoridade competente: **AAIP — Agencia de Acceso a la
  Información Pública**
  - Site: https://www.argentina.gob.ar/aaip
  - Canal: https://www.argentina.gob.ar/aaip/datospersonales
- Prazo: a lei original não define prazo, mas reforma prevista
  (PEN 2023) estabelece 72h — adotar por precaução

---

## 8. Risco de Sanção — Arts. 31–33

| Infração                          | Classificação | Sanção             |
|-----------------------------------|:-------------:|--------------------|
| Tratamento sem consentimento      | Grave         | Suspensão + multa  |
| Negação de direito ao titular     | Grave         | Multa + publicação |
| Transferência internacional ilegal| Grave         | Suspensão do banco |
| Falta de registro na AAIP         | Leve          | Advertência + multa|

---

## 9. Roadmap de Conformidade

### Obrigatório antes de operar na Argentina
- [ ] Registrar base `device_sessions` na AAIP (Art. 21)
- [ ] Definir processo de triagem de solicitações com SLA de 5 dias úteis
- [ ] Formalizar cláusulas contratuais com Sentry e Mapbox

### Recomendado
- [ ] Implementar direito de Oposição (após mapear analytics)
- [ ] Designar representante local na Argentina (boas práticas)
- [ ] Adicionar Argentina ao canal de contato de privacidade

---

## 10. Comparativo Regional

| Aspecto              | LGPD (Brasil) | Ley 21.719 (Chile) | Ley 25.326 (Argentina) |
|----------------------|:-------------:|:------------------:|:----------------------:|
| Vigência             | 2020          | 01/12/2026         | 2000 (em vigor)        |
| Fiscalização         | ANPD          | Agencia Prot.      | AAIP                   |
| Prazo de resposta    | 15 dias       | A regulamentar     | 5 dias úteis           |
| Registro de BD       | Não exige     | Não exige          | ✅ Exige (AAIP)         |
| Transferência inter. | Adequação     | Adequação          | Adequação              |
| Dados sensíveis      | Rol definido  | Ampliado           | Rol definido           |