# Roadmap Movia — Plano Completo por Camadas

> Documento gerado em 2026-06-27. Cobre todos os pontos pendentes levantados nas sessões de desenvolvimento, documentos de notas e diretrizes de boas práticas (SOLID, Clean Architecture, Docker multi-stage, logs estruturados, SDD).

---

## Camada 1 — Críticos antes do APK RC

- [ ] Fix layout do aviso de áudio (card sobreposto ao botão de localização e texto cortado)
- [ ] Detecção real de áudio ativo no Android — mostrar aviso somente se houver música/áudio tocando ✅ implementado, pendente validação física
- [ ] Não mostrar aviso de áudio se não houver música ativa ✅ implementado
- [ ] Teste físico do APK em celular real
- [ ] Smoke test completo no dispositivo: rota simples, rota com baldeação, app em background, tela bloqueada, localização negada, notificação negada, internet instável, sem internet, com música tocando, sem música tocando
- [ ] Rotação de credenciais expostas no chat (JWT_SECRET, METRICS_TOKEN, senha RDS)

---

## Camada 2 — Infraestrutura / Banco de dados

- [ ] Migrar banco de dados de AWS RDS para Cloud SQL (Google)
- [ ] Atualizar DATABASE_URL no Secret Manager após migração
- [ ] Atualizar Terraform para cobrir Cloud SQL
- [ ] Atualizar docs de deployment após migração
- [ ] Keystore de produção Android
- [ ] Atualizar pnpm de 9.x para 11.x
- [ ] Política de Privacidade pública via GitHub Pages

---

## Camada 3 — Offline-first / Resiliência

**Cache local (SQLite)**
- [ ] SQLite local para dados essenciais
- [ ] Cache local de linhas, estações, conexões, baldeações, tempos médios, POIs

**Busca offline**
- [ ] Busca offline por estações e POIs
- [ ] Cache de endereços, Places já resolvidos e estação mais próxima de locais já buscados

**Detecção de conectividade**
- [ ] NetInfo para detectar online/offline
- [ ] Banner de modo offline e banner de reconexão

**Fallbacks**
- [ ] Fallback quando Google Places falhar
- [ ] Fallback quando Geocoding falhar
- [ ] Fallback quando backend estiver indisponível
- [ ] Continuação da rota ativa sem internet
- [ ] Timeline funcionando com dados salvos

---

## Camada 4 — UX / Visual

- [ ] Efeito de linha ativa com glow na timeline
- [ ] Gradiente animado apenas no trecho ativo
- [ ] Polimento visual das baldeações
- [ ] Melhoria visual da troca de cor entre linhas
- [ ] Ajustes em telas pequenas, fonte grande do Android, teclado aberto
- [ ] Revisão de scroll em todas as telas longas
- [ ] Revisão da tela de política de privacidade
- [ ] Revisão da tela de configurações

---

## Camada 5 — Logs / Observabilidade

- [ ] Logs estruturados em JSON em todos os serviços
- [ ] requestId em todas as requisições (middleware global)
- [ ] traceId para fluxos importantes (rota, ETA, busca)
- [ ] Logs separados por finalidade: rota/ETA, Places/Geocoding, fallback, privacidade, segurança, deploy/smoke
- [ ] Redução de logs ruidosos
- [ ] Remoção de console.log desnecessário
- [ ] Garantia de que nenhum dado sensível seja logado

---

## Camada 6 — API / Erros

- [ ] Error envelope padrão com código estável, requestId, path, timestamp
- [ ] Mensagem segura para o usuário (sem stack trace)
- [ ] Tratamento consistente de timeout e fallback
- [ ] Revisão geral de status codes HTTP
- [ ] Documentação dos erros públicos

---

## Camada 7 — Docker / Build

- [ ] Multi-stage build no Dockerfile (builder + runtime) — reduzir imagem de ~300MB para ~180MB
- [ ] HEALTHCHECK no Dockerfile
- [ ] Validação do tamanho da imagem no CI
- [ ] Confirmar que imagem final não inclui devDependencies

---

## Camada 8 — Arquitetura / Documentação

**ADRs**
- [ ] ADR-001: Migração Cloud SQL
- [ ] ADR-002: Offline-first com SQLite
- [ ] ADR-003: Motor de rota (Dijkstra + penalidade de baldeação)
- [ ] ADR-004: ETA com EWMA + fallback inercial
- [ ] ADR-005: Consentimento e privacidade (Ley 21.719 + LGPD)
- [ ] ADR-006: Workload Identity Federation

**SDD (Software Design Document)**
- [ ] 01-visao-geral (contexto, objetivos)
- [ ] 02-requisitos (funcionais, não funcionais)
- [ ] 03-arquitetura (visão, diagramas, tecnologias)
- [ ] 04-design-detalhado (modelo de dados, módulos, interfaces, fluxos)
- [ ] 05-seguranca (autenticação, controles)
- [ ] 06-testes (estratégia, casos)
- [ ] 07-operacional (deploy, monitoramento, backup)

**Documentos avulsos**
- [ ] Documento de arquitetura atual
- [ ] Documento de fluxos principais
- [ ] Documento de decisão de rota
- [ ] Documento de estratégia offline-first
- [ ] Documento de logs e observabilidade
- [ ] Documento de QA mobile

---

## Camada 9 — Clean Architecture Incremental

- [ ] Separar domínios de rota, ETA, viagem ativa e busca em módulos próprios
- [ ] Separar infraestrutura de Google Places e storage/cache (interface + implementação)
- [ ] Separar DTOs de tipos de domínio
- [ ] Reduzir funções grandes (acima de 100 linhas)
- [ ] Remover responsabilidades misturadas
- [ ] Criar interfaces pequenas quando fizer sentido
- [ ] Unificar cópia duplicada do loop de path em buildRouteOption() com buildPathFromSegments()

---

## Camada 10 — CI/CD e Release

- [ ] Build APK automático no GitHub Actions
- [ ] Upload do APK como artefato do workflow
- [ ] SHA-256 automático do APK gerado
- [ ] Release candidate com tag semântica (v2.x.x-rc.N)
- [ ] Checklist automático antes de release
- [ ] Smoke test pós-deploy mais completo
- [ ] Validação de secrets no CI
- [ ] Validação de Docker image size no CI
- [ ] Documentação do Workload Identity Federation

---

## Camada 11 — Testes Automatizados

- [ ] Testes do modo offline (mock de NetworkInfo)
- [ ] Testes de reconexão
- [ ] Testes de cache local (hit, miss, expiração)
- [ ] Testes de fallback de Places e Geocoding
- [ ] Testes de erro de backend indisponível
- [ ] Testes de áudio ativo e inativo (mock do módulo nativo)
- [ ] Testes de layout com lista longa
- [ ] Testes de rota ativa após background e após app reabrir

---

## Camada 12 — Futuro pós-RC

- [ ] Motor de recomendação de rota mais avançado
- [ ] Critérios documentados de escolha de rota
- [ ] Rota alternativa por incidente de linha
- [ ] Status de rede/linha em tempo real
- [ ] Estação fechada / acesso fechado
- [ ] syncStatus, isDirty, fila local de sincronização
- [ ] Resolução de conflitos simples
- [ ] Favoritos offline
- [ ] Histórico de rotas recentes
- [ ] Validação empírica do motor inercial e LocationFusion no metrô real
- [ ] Movia Brasil — reconstrução do zero com infraestrutura correta

---

## Itens já concluídos (referência)

- ✅ Bug de baldeação desaparecendo da rota (Tobalaba, Los Héroes)
- ✅ ETA com espera estimada de baldeação (etaBreakdown)
- ✅ Rota alternativa com reasonCode + i18n nos 3 idiomas
- ✅ Política de Privacidade 2.0 com consentimento real persistido
- ✅ Places/Geocoding com preferência de linha de origem
- ✅ LocationFusion + Speed Gate conectado ao backend
- ✅ Lembrete de áudio condicional (módulo nativo Kotlin)
- ✅ CI/CD (Security Gate + Deploy Staging via Workload Identity Federation)
- ✅ Terraform base
- ✅ Coordenada errada de Tobalaba corrigida no banco
- ✅ Movia Brasil desprovisionado
