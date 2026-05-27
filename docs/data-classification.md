# Movia — Classificação de Dados

## 1. Inventário de Dados Pessoais

| Dado                  | Classificação | Onde Armazenado        | Retenção    | Base Legal LGPD     |
|-----------------------|:-------------:|------------------------|-------------|---------------------|
| deviceId (UUID v4)    | Sensível      | SecureStore + DB       | 7 dias      | Consentimento Art.7 |
| Idioma preferido      | Pessoal       | SecureStore + JWT      | Sessão      | Consentimento Art.7 |
| Localização GPS       | Sensível      | Não persistida         | Em memória  | Consentimento Art.7 |
| Token JWT             | Confidencial  | SecureStore            | 24h         | Execução contrato   |
| Refresh token         | Confidencial  | DB (hash)              | 7 dias      | Execução contrato   |
| IP do dispositivo     | Pessoal       | DB (device_sessions)   | 7 dias      | Legítimo interesse  |
| Logs de uso           | Operacional   | Servidor (mascarado)   | 30 dias     | Legítimo interesse  |

## 2. Classificação por Nível

### Confidencial
- Tokens JWT e refresh tokens
- JWT_SECRET e variáveis de ambiente
- Credenciais de banco de dados

### Sensível
- deviceId — identificador único do dispositivo
- Coordenadas GPS — processadas em memória, nunca persistidas

### Pessoal
- Idioma preferido
- IP do dispositivo (mascarado nos logs)

### Operacional
- Logs de aplicação (correlation ID, latência, status HTTP)
- Métricas de uso agregadas

## 3. Fluxo de Dados
Mobile
└─ SecureStore (deviceId, JWT, idioma)
└─ GPS (memória apenas)
└─ POST /geo/location → GeoService (processa, não persiste coords)
└─ JWT payload (deviceId mascarado nos logs)
Backend
└─ device_sessions (deviceId, refreshToken, language, ip, expiresAt)
└─ network_state (status das linhas — sem dados pessoais)
└─ Logs estruturados (IDs mascarados, sem coordenadas)

## 4. Subprocessadores Externos

| Serviço  | Finalidade              | Dados Compartilhados     | Política          |
|----------|-------------------------|--------------------------|-------------------|
| Sentry   | Monitoramento de erros  | Stack traces (sem PII)   | sentry.io/privacy |
| Mapbox   | Renderização de mapas   | Tiles estáticos          | mapbox.com/legal  |

## 5. Direitos do Titular

| Direito              | Como Exercer                        |
|----------------------|-------------------------------------|
| Acesso               | GET /v1/privacy/export              |
| Exclusão             | DELETE /v1/privacy/data             |
| Revogação consentimento | Configurações → Privacidade      |
| Portabilidade        | GET /v1/privacy/export (JSON)       |