# Changelog

## Movia 2.2.1 — Route Experience, Privacy and Places

### Added
- Busca de endereço e lugares via Google Places/Geocoding, resolvida no
  backend para a estação mais próxima antes de qualquer cálculo de rota.
- Preferência de estação por linha de origem na busca de endereço/lugar.
- Política de Privacidade 2.0 (tela completa, 3 idiomas) e novo fluxo de
  consentimento, com versão exigindo reaceite de usuários anteriores.
- Persistência real de eventos de consentimento (`ConsentEvent`), com
  accountability auditável (concessão e revogação).
- Telas explicativas de permissão (localização e notificação) antes do
  prompt nativo do sistema.
- Sugestão de rota alternativa gratuita, quando há vantagem clara (menos
  baldeações, menos caminhada, ou linhas diferentes), com motivo exposto
  como código estável (`reasonCode`) traduzido nos 3 idiomas.
- `etaBreakdown` detalhado na resposta de ETA: tempo de viagem, parada,
  caminhada de baldeação e espera estimada de baldeação (faixa 1–5 min).
- Timeline de viagem animada, com gradiente por linha e progresso estimado.
- `LocationFusion`: fusão de GPS + veredito inercial + Speed Gate
  (detecção de "âncora fantasma"), conectada ao backend via
  `/v1/geo/location`.
- Persistência de estado de viagem ativa entre fechamentos do app
  (`activeTripCache`, TTL 12h).
- Lembrete de segurança de áudio (uma vez por ano).

### Changed
- Penalidade de espera de baldeação (180s) unificada entre o motor de
  roteamento (escolha da rota recomendada) e o motor de ETA (tempo
  exibido) — antes usavam modelos de custo diferentes, podendo mostrar a
  alternativa como mais rápida que a recomendada.
- Polling de localização durante viagem ativa: 10s → 5s.

### Fixed
- Estação de baldeação desaparecia do `path` retornado pela API
  (afetava toda rota com transferência de linha, ex: Tobalaba, Los Héroes).
- Consentimento de privacidade não era persistido de fato (só logado).
- Dependência `query-string` reintroduzida por engano, sem uso real.
- Incompatibilidade entre `@expo/cli` e `tar` v7 no `prebuild` do Android.

### Security
- Vulnerabilidades de dependências corrigidas: `form-data`, `@opentelemetry/core`,
  `multer`.
- `pnpm audit` sem vulnerabilidades conhecidas.
- Análise estática (Semgrep, OWASP Top Ten + JS/TS + secrets): sem ocorrências.
- Feature de incidentes do metrô hibernada (fonte real divergia do rótulo
  "fonte oficial" exibido ao usuário).
- Recursos do Movia Brasil (Cloud Run, Cloud SQL) desprovisionados —
  ambiente será reconstruído do zero quando reativado.

### Known limitations
- Não há rastreamento em tempo real de trens (decisão de produto deliberada).
- Validação de campo (uso real no metrô) da detecção de baldeação, motor
  inercial e Speed Gate ainda pendente.
- Acessos de entrada/saída de estação implementados apenas para 1 de ~126
  estações.
- APK gerado para testes internos (keystore de debug), não para loja.
