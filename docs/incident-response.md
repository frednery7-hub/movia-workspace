# Movia — Plano de Resposta a Incidentes de Segurança
## Conformidade: Ley 21.719 (Chile) | LGPD (Brasil)

---

## 1. Classificação de Incidentes

| Severidade | Descrição | Exemplos |
|:----------:|-----------|---------|
| P0 — Crítico | Exposição confirmada de dados pessoais | Vazamento de banco, acesso não autorizado em produção |
| P1 — Alto | Suspeita de exposição ou comprometimento | Credencial exposta no git, log com PII visível |
| P2 — Médio | Anomalia que pode evoluir | Pico de autenticações falhas, token inválido em massa |
| P3 — Baixo | Higiene e conformidade | CVE sem exploração ativa, dependência desatualizada |

---

## 2. Fluxo de Resposta

### Fase 1 — Detecção (0–1h)
- [ ] Alerta Sentry ou log de segurança identifica anomalia
- [ ] Responsável técnico confirma o incidente
- [ ] Classifica severidade (P0/P1/P2/P3)
- [ ] Abre issue privada no repositório com label `security-incident`

### Fase 2 — Contenção (1–4h)
- [ ] P0: revogar TODAS as sessões ativas via `DeviceSession.updateMany({ data: { revoked: true } })`
- [ ] P0: rotacionar `JWT_SECRET` e reiniciar backend
- [ ] P0/P1: bloquear origem suspeita no Nginx
- [ ] Preservar logs para análise forense — NÃO apagar

### Fase 3 — Análise (4–24h)
- [ ] Identificar vetor de ataque
- [ ] Mapear dados expostos (quais deviceIds, período, volume)
- [ ] Determinar se dados sensíveis foram acessados
- [ ] Documentar linha do tempo com timestamps

### Fase 4 — Notificação (24–72h)
#### Ley 21.719 (Chile)
- [ ] Notificar Agencia de Protección de Datos Personales
- [ ] Se dados sensíveis expostos: notificar titulares afetados
- [ ] Prazo: conforme regulamentação da Agência (previsto 24–72h)

#### LGPD (Brasil — se aplicável)
- [ ] Notificar ANPD em até 2 dias úteis
- [ ] Notificar titulares se risco relevante

### Fase 5 — Recuperação (24–72h)
- [ ] Aplicar correção no código
- [ ] Rodar `pnpm audit --prod` após correção
- [ ] Deploy com novo `JWT_SECRET`
- [ ] Monitorar logs por 72h após recuperação

### Fase 6 — Pós-incidente (até 5 dias úteis)
- [ ] Relatório completo em `docs/incidents/YYYY-MM-DD-descricao.md`
- [ ] Root cause analysis (RCA)
- [ ] Atualizar este plano se necessário
- [ ] Comunicar resultado à Agência reguladora

---

## 3. Comandos de Emergência

### Revogar todas as sessões ativas
```sql
UPDATE device_sessions SET revoked = true WHERE revoked = false;
```

### Bloquear dispositivo específico
```bash
curl -X POST https://api.movia.com/v1/privacy/block \
  -H "Authorization: Bearer <admin_token>"
```

### Verificar sessões ativas suspeitas
```sql
SELECT device_id, ip_address, created_at
FROM device_sessions
WHERE revoked = false
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## 4. Contatos de Emergência

| Papel | Responsabilidade |
|-------|-----------------|
| Responsável Técnico | Contenção e análise técnica |
| DPO / Encarregado | Notificação regulatória e comunicação com titulares |
| Jurídico | Avaliação de obrigações legais e prazo de notificação |

**Agencia de Protección de Datos Personales (Chile):**
- Site: https://www.agenciadedatos.cl
- Vigência da obrigação: 01/12/2026

**ANPD (Brasil):**
- Site: https://www.gov.br/anpd
- Prazo: 2 dias úteis após ciência do incidente

---

## 5. Lições Aprendidas

| Data | Incidente | Ação Corretiva |
|------|-----------|----------------|
| —    | —         | —              |

*Registrar aqui cada incidente após resolução.*