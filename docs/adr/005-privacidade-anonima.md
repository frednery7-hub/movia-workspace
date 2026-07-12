# ADR-005 — Identidade anônima por dispositivo

**Status:** Aceito
**Data:** anterior a 2026-07 (registrado retroativamente)

## Contexto

O Movia planeja rotas de metrô. Para isso, não precisa saber quem você é:
precisa saber onde você está e para onde quer ir. Qualquer dado pessoal
coletado além disso seria responsabilidade sem contrapartida — sujeito à
LGPD (Brasil), à Ley 21.719 (Chile) e à Ley 25.326 (Argentina), com risco
de vazamento e obrigação de resposta a titulares.

## Decisão

**Não existe conta de usuário.** A identidade é um `deviceId` (UUID gerado
no dispositivo), sem e-mail, telefone, nome ou qualquer PII.

- O `deviceId` e os tokens ficam em armazenamento seguro do sistema
  operacional (`expo-secure-store`), não em storage comum.
- A autenticação emite um JWT curto (acesso) e um refresh token hasheado
  em SHA-256, rotacionado a cada uso e revogável.
- Sessões expiradas são purgadas automaticamente (`cleanup.service.ts`).
- O consentimento é registrado (`consent_events`) e revogável pelo app.
- A política de privacidade é pública, em três idiomas, gerada a partir da
  mesma fonte de tradução usada no app — para nunca divergir.

## Alternativas consideradas

**Login com conta (e-mail/social).** Rejeitada: introduz PII que o produto
não precisa, e com ela todo o aparato de proteção, retenção e resposta a
titulares. Também adiciona atrito num app que deve ser aberto e usado em
segundos, na plataforma.

**Nenhuma identidade (tudo público).** Rejeitada: sem identidade não há como
aplicar rate limiting por dispositivo, bloquear abuso, nem oferecer
histórico e favoritos.

## Consequências

**Positivas:**
- Não há dados pessoais para vazar, porque não são coletados.
- Conformidade regulatória fica substancialmente mais simples.
- Zero atrito de cadastro.

**Negativas / aceitas:**
- **Qualquer `deviceId` é aceito em `/v1/auth/session`.** Um UUID vazado
  permitiria a terceiros consultar ou bloquear aquela sessão. Mitigado por
  rate limiting (5/min) e pelo fato de não haver dado pessoal atrás dele.
  Um mecanismo de *proof-of-possession* resolveria isso e continua em
  aberto (item B6 da auditoria de 2026-07-09).
- Perder o dispositivo significa perder o histórico: não há conta para
  restaurar. É a contrapartida direta de não guardar PII.
