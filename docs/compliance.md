# Movia — Compliance Corporativo

## 1. Matriz de Permissões por Perfil

| Recurso                  | anonymous_device | user | operator | admin |
|--------------------------|:----------------:|:----:|:--------:|:-----:|
| POST /auth/session       | ✅               | ✅   | ✅       | ✅    |
| POST /auth/refresh       | ✅               | ✅   | ✅       | ✅    |
| DELETE /auth/session     | ✅               | ✅   | ✅       | ✅    |
| GET /auth/me             | ✅               | ✅   | ✅       | ✅    |
| GET /lines               | ✅               | ✅   | ✅       | ✅    |
| GET /eta/:id             | ✅               | ✅   | ✅       | ✅    |
| POST /geo/location       | ✅               | ✅   | ✅       | ✅    |
| GET /privacy/export      | ✅               | ✅   | ✅       | ✅    |
| DELETE /privacy/data     | ✅               | ✅   | ✅       | ✅    |
| GET /health/*            | ✅               | ✅   | ✅       | ✅    |

## 2. Política de Sessão

- Access token: 24h
- Refresh token: 7 dias com rotação obrigatória
- Revogação imediata via DELETE /auth/session
- Máximo 5 sessões criadas por minuto por IP
- Sessões expiradas removidas automaticamente a cada 24h

## 3. Política de Retenção

| Dado                  | Retenção       | Justificativa             |
|-----------------------|----------------|---------------------------|
| device_sessions       | 7 dias         | Duração do refresh token  |
| Sessões revogadas     | 7 dias         | Auditoria mínima          |
| Localização           | Não persistida | Minimização LGPD          |
| Logs de aplicação     | 30 dias        | Diagnóstico operacional   |
| Logs de segurança     | 90 dias        | Resposta a incidentes     |

## 4. Política de Backup

- Banco PostgreSQL: backup diário automatizado via pg_dump
- Retenção de backups: 30 dias
- Restore testado mensalmente
- Backups armazenados em local separado do servidor principal

## 5. Registro de Acesso Administrativo

- Todos os acessos administrativos registrados via LoggingInterceptor
- Correlation ID único por request
- Logs estruturados com timestamp, método, rota e status
- Logs de segurança separados dos logs de aplicação

## 6. Trilha de Auditoria

- Criação de sessão: registrada na tabela device_sessions
- Revogação de sessão: campo revoked + updatedAt
- Limpeza de dados: registrada via CleanupService logger
- Exportação de dados: endpoint GET /privacy/export com log

## 7. Política de Resposta a Incidente

1. Detecção via Sentry ou alerta de log
2. Isolamento do serviço afetado
3. Revogação de todas as sessões ativas se necessário
4. Análise de causa raiz
5. Comunicação aos usuários afetados em até 72h (LGPD Art. 48)
6. Relatório pós-incidente em até 5 dias úteis