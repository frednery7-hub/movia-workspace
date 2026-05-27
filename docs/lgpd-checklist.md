# Movia — Checklist LGPD

## Base Legal
- [x] Consentimento explícito coletado na tela de onboarding
- [x] Versão do consentimento registrada (v1.0)
- [x] Data e hora do consentimento armazenados
- [x] Consentimento pode ser revogado a qualquer momento
- [x] Base legal documentada por tipo de dado

## Minimização de Dados
- [x] Localização GPS não é persistida no banco
- [x] deviceId é UUID v4 — não vinculado a hardware rastreável
- [x] Logs mascaram identificadores (maskId, maskCoord)
- [x] Coordenadas nos logs truncadas a 2 casas decimais (~1km precisão)
- [x] IP armazenado apenas para segurança anti-abuso

## Direitos do Titular
- [x] GET /v1/privacy/export — exportação de dados em JSON
- [x] DELETE /v1/privacy/data — exclusão completa de dados
- [x] Tela de configurações com opção de revogar consentimento
- [ ] Resposta ao titular em até 15 dias (processo manual pendente)
- [ ] Canal de contato para solicitações de privacidade

## Segurança
- [x] Dados em trânsito protegidos por HTTPS/TLS
- [x] Tokens armazenados no SecureStore (Keychain/Keystore)
- [x] JWT com expiração de 24h
- [x] Refresh token com rotação e revogação
- [x] Rate limiting para prevenção de abuso
- [x] Zero vulnerabilidades conhecidas (pnpm audit)

## Transparência
- [x] Tela de consentimento com linguagem clara
- [x] Explicação do motivo de cada coleta
- [x] Política de retenção documentada
- [x] Subprocessadores listados em data-classification.md

## Retenção e Descarte
- [x] Sessões expiradas removidas automaticamente a cada 24h
- [x] Sessões revogadas removidas após 7 dias
- [x] Localização nunca persist