# Movia — Design Report Completo
> Versão para referência no Figma — Área de Ideias

---

## 1. IDENTIDADE VISUAL

### Missão do produto
App de mobilidade urbana offline-first focado em privacidade, roteamento inteligente e inteligência de trânsito. Contexto inicial: Metro de Santiago, Chile.

### Princípios de design
- **Clareza operacional** — o usuário está em movimento. Toda informação precisa ser legível em 1 segundo.
- **Confiança pelo dado** — status de linha, tarifa, previsão de ETA. Informação confiável > informação rápida incorreta.
- **Privacidade visível** — o usuário sabe o que está sendo coletado.
- **Offline-first** — o app deve funcionar mesmo sem conexão ativa.

---

## 2. PALETA DE CORES

### Cores das Linhas — Metro de Santiago
| Linha | Nome | Hex | Uso |
|-------|------|-----|-----|
| L1 | Vermelho | `#E31837` | Linha 1 |
| L2 | Laranja | `#F26522` | Linha 2 |
| L3 | Amarelo | `#FFD100` | Linha 3 |
| L4 | Azul Claro | `#00A0DF` | Linha 4 |
| L4A | Azul Claro | `#00A0DF` | Linha 4A (mesma cor L4) |
| L5 | Verde | `#00A550` | Linha 5 |
| L6 | Roxo | `#9B59B6` | Linha 6 |

### Cores de Tarifa Dinâmica
| Período | Nome | Hex | Ícone | Horário |
|---------|------|-----|-------|---------|
| Punta | Laranja | `#F26522` | 🟠 | 07:00–08:59 e 18:00–19:59 |
| Valle | Verde | `#4CAF50` | 🟢 | 09:00–17:59 e 20:00–20:44 |
| Bajo | Azul | `#2196F3` | 🔵 | 06:00–06:59 e 20:45–23:00 |

### Cores de Interface (UI)
| Token | Hex | Uso |
|-------|-----|-----|
| `bg-dark` | `#1a1a2e` | Header da Sidebar, fundos escuros |
| `accent-primary` | `#E31837` | Seleção ativa, estação atual, idioma selecionado |
| `status-green` | `#4CAF50` | Bolinha de status ativo (online) |
| `white` | `#FFFFFF` | Fundo de cards |
| `gray-surface` | `#F5F5F5` | Fundos secundários |
| `gray-text` | `#9E9E9E` | Texto desabilitado, estações futuras |
| `gray-border` | `#E0E0E0` | Divisores, bordas |

### Cores de Alertas — Feed de Ocorrências
| Tipo | Background | Hex | Uso |
|------|-----------|-----|-----|
| Atraso | Amarelo claro | `#FAEEDA` | Badge de atraso |
| Alerta | Vermelho claro | `#FCEBEB` | Badge de alerta/incidente |
| Normal | Verde claro | `#EAF3DE` | Badge de operação normal |

---

## 3. TIPOGRAFIA

### Hierarquia
| Nível | Tamanho | Peso | Uso |
|-------|---------|------|-----|
| Header Title | 18px | Bold (700) | Títulos de tela |
| Section Title | 16px | SemiBold (600) | Seções da sidebar |
| Body | 14px | Regular (400) | Texto geral |
| Caption | 12px | Regular (400) | Timestamps, labels secundários |
| Badge | 11px | Medium (500) | Badges de status |

### Fonte
- **Principal:** System font (San Francisco no iOS, Roboto no Android)
- **Fallback:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

---

## 4. ESPAÇAMENTO E GRID

### Escala de espaçamento
| Token | Valor | Uso |
|-------|-------|-----|
| `xs` | 4px | Gap interno mínimo |
| `sm` | 8px | Padding interno de badges |
| `md` | 12px | Gap entre elementos |
| `lg` | 16px | Padding padrão de cards |
| `xl` | 24px | Padding de seções |
| `2xl` | 32px | Separação entre blocos |

### Bordas e Raios
| Token | Valor | Uso |
|-------|-------|-----|
| `radius-sm` | 4px | Badges, pills |
| `radius-md` | 8px | Cards, botões |
| `radius-lg` | 12px | Modais, bottom sheets |
| `radius-full` | 50% | Avatares, bolinhas de status |

---

## 5. COMPONENTES

---

### 5.1 SIDEBAR

**Estrutura geral:** Bottom sheet lateral deslizante da esquerda. Ocupa ~85% da largura da tela.

#### Header da Sidebar
- **Background:** `#1a1a2e` (escuro)
- **Altura:** 100px
- **Conteúdo:**
  - Avatar do perfil (círculo, 40x40px, canto superior esquerdo)
  - Nome do usuário ou "Usuário Anônimo"
  - Cidade detectada via GPS (ex: "Santiago, CL") — ícone de pin + texto 12px, cor branca com 70% opacidade
  - Rede detectada (ex: "Metro de Santiago") — texto 12px branco
  - Bolinha de status verde `#4CAF50` ao lado do nome da rede (8x8px, `border-radius: 50%`)

#### Banner de Tarifa Dinâmica
- **Posição:** Logo abaixo do header
- **Altura:** 48px
- **Background:** Cor da tarifa atual (Punta `#F26522`, Valle `#4CAF50`, Bajo `#2196F3`) com 15% opacidade
- **Conteúdo:**
  - Ícone colorido (círculo 10px) + Nome da tarifa (ex: "Valle") em bold
  - Horário de vigência (ex: "09:00 – 17:59") em 12px
  - Border-left 3px sólida na cor da tarifa

#### Seção de Linhas
- **Título:** "Linhas" — 12px, uppercase, `#9E9E9E`, padding 16px horizontal
- **Item de linha:**
  - Círculo colorido 16px (cor da linha) — `border-radius: 50%`
  - Label "L1", "L2" etc. dentro do círculo — 10px, bold, branco
  - Nome da linha — 14px, `#212121`
  - Status à direita — badge pequeno (Normal/Atraso/Alerta)
  - Altura do item: 48px
  - Separador: `1px solid #F0F0F0`

#### Feed de Alertas (Ocorrências X/Twitter)
- **Título:** "Ocorrências" — mesmo padrão da seção de Linhas
- **Filtros por linha:** Chips horizontais roláveis no topo da seção
  - Chip selecionado: fundo `#E31837`, texto branco
  - Chip não selecionado: borda `#E0E0E0`, texto `#757575`
- **Item de alerta:**
  - Badge no topo esquerdo (Atraso/Alerta/Normal com suas respectivas cores)
  - Texto do tweet — 13px, máximo 2 linhas, truncar com "..."
  - Timestamp relativo — 11px, `#9E9E9E` (ex: "há 15 min")
  - Altura do item: 72px mínimo
  - Divisor entre itens: `1px solid #F0F0F0`

#### Seletor de Idioma
- **Posição:** Rodapé da sidebar, acima de Configurações
- **Layout:** 3 opções inline lado a lado
- **Formato de cada opção:** Bandeira (emoji 14px) + código (ex: "ES") — sem rótulo longo
- **Estado selecionado:** Background `#E31837`, texto branco, border-radius 4px
- **Estado não selecionado:** Texto `#757575`, sem fundo
- **Opções:** 🇨🇱 ES | 🇧🇷 PT | 🇺🇸 EN

#### Item Configurações (rodapé)
- **Ícone:** Engrenagem, 20px, `#757575`
- **Label:** "Configurações" — 14px
- **Posição:** Última linha antes de fechar a sidebar
- **Altura:** 52px

---

### 5.2 TELA HOME — Mapa

**Estrutura geral:** Mapa fullscreen estilo Uber com elementos sobrepostos.

#### Mapa
- **Estilo:** Mapa minimalista (OpenStreetMap ou Mapbox) — modo claro por padrão
- **Elementos sobre o mapa:**
  - Traçados das linhas do metro (polylines coloridas por linha)
  - Marcadores de estação (círculo branco com borda colorida da linha, 12px)
  - Marcador de posição atual do usuário (ponto azul com halo pulsante)

#### Barra de Busca
- **Posição:** Topo da tela, sobre o mapa
- **Altura:** 52px
- **Background:** Branco, `border-radius: 26px`, sombra leve (`box-shadow: 0 2px 8px rgba(0,0,0,0.15)`)
- **Conteúdo:**
  - Ícone de hambúrguer (esquerda) — abre Sidebar
  - Placeholder: "Para onde?" — 16px, `#9E9E9E`
  - Ícone de busca (direita) — `#757575`
- **Margin:** 16px horizontal, 52px do topo (safe area)

#### Card de Tarifa (aparece antes de embarcar)
- **Posição:** Acima da barra de busca ou como bottom sheet
- **Background:** Branco
- **Conteúdo:**
  - Período atual: ícone colorido + nome + horário
  - Tarifa vigente em destaque
  - Próxima mudança de tarifa com countdown
- **Trigger:** Quando usuário seleciona destino e antes de iniciar navegação

#### Botão de Localização
- **Posição:** Canto inferior direito, acima da barra de busca
- **Tamanho:** 44x44px, círculo branco com sombra
- **Ícone:** Alvo/GPS, 20px, `#757575`

---

### 5.3 TELA DE NAVEGAÇÃO ATIVA

**Trigger:** Usuário confirmou rota e iniciou navegação.

#### Header
- **Background:** `#1a1a2e` (escuro)
- **Altura:** 72px
- **Conteúdo:**
  - Estação de origem (texto 12px branco 70% opacidade)
  - Seta → (ícone 16px, branco)
  - Estação de destino (texto 14px branco bold)
  - Botão X para cancelar navegação (canto direito, 24x24px)

#### Card de Resumo
- **Background:** Branco
- **Border-radius:** 12px
- **Padding:** 16px
- **Conteúdo:**
  - Tempo estimado em destaque (ex: "18 min") — 28px bold `#212121`
  - Horário de chegada ISO-8601 formatado (ex: "Chega às 14:32") — 14px `#757575`
  - Número de estações (ex: "7 estações") — 12px `#9E9E9E`
  - Se houver atraso: badge "Atraso ~2 min" com background `#FAEEDA`
  - Se houver predição AI: ícone ✨ + "Predição AI aplicada" — 11px `#9E9E9E`

#### Progress Bar Vertical (componente central)
**Este é o componente principal da tela.**

- **Layout:** Lista vertical de estações com barra lateral colorida
- **Barra lateral:**
  - Largura: 3px
  - Cor: cor da linha atual
  - Funciona como trilho do progresso
  - Linha tracejada para estações futuras
  - Linha sólida para estações percorridas
- **Estados das estações:**

| Estado | Ícone | Cor do texto | Opacidade |
|--------|-------|-------------|-----------|
| Percorrida | Círculo preenchido pequeno | `#9E9E9E` | 50% |
| Atual | Círculo maior com border `#E31837` | `#212121` | 100% |
| Futura | Círculo vazio | `#757575` | 70% |

- **Estação atual:**
  - Destaque visual: background `#FFEBEE` na linha inteira
  - Ícone: círculo 14px com borda 2px `#E31837`
  - Nome da estação: 15px, bold, `#E31837`
  - Label "Você está aqui" — 11px `#E31837`

- **Conexões de linha (baldeações):**
  - Exibidas como chip colorido na cor da linha de conexão
  - Posicionadas entre a estação de baldeação e a próxima
  - Conteúdo: "→ L" + número da linha + nome da linha destino
  - Background: cor da linha destino com 15% opacidade
  - Border: 1px sólida na cor da linha destino

- **Estações percorridas:**
  - Opacidade reduzida (40-50%)
  - Ícone: círculo preenchido pequeno `#9E9E9E`
  - Nome: 13px, `#9E9E9E`

- **Estações futuras:**
  - Ícone: círculo vazio, borda `#E0E0E0`
  - Nome: 14px, `#757575`

---

### 5.4 BADGE DE STATUS DE LINHA

| Estado | Background | Cor do texto | Label |
|--------|-----------|-------------|-------|
| Normal | `#EAF3DE` | `#2E7D32` | "Normal" |
| Atraso | `#FAEEDA` | `#E65100` | "Atraso" |
| Alerta | `#FCEBEB` | `#C62828` | "Alerta" |
| Suspenso | `#EEEEEE` | `#616161` | "Suspenso" |

- **Padding:** 4px 8px
- **Border-radius:** 4px
- **Font-size:** 11px, Medium (500)

---

### 5.5 CHIP DE LINHA (identificador)

- **Formato:** Círculo 24x24px (compacto) ou pílula 28x auto (expandido)
- **Background:** Cor da linha
- **Texto:** "L1", "L2", etc. — 11px, bold, branco
- **Uso:** Filtros, identificadores em listas, badges de baldeação

---

## 6. FLUXO DE TELAS

```
App Launch
    │
    ▼
[Splash / Boot]
    │ JWT check + consentimento LGPD
    ▼
[Tela Home — Mapa]
    │
    ├──── [Toque no hambúrguer]
    │         │
    │         ▼
    │     [Sidebar]
    │     ├── Perfil + GPS + Rede
    │     ├── Banner Tarifa Dinâmica
    │     ├── Lista de Linhas + status
    │     ├── Feed de Alertas (X)
    │     ├── Seletor de Idioma
    │     └── Configurações
    │
    ├──── [Toque na barra de busca]
    │         │
    │         ▼
    │     [Busca de destino]
    │         │
    │         ▼
    │     [Card de tarifa + ETA preview]
    │         │
    │         ▼
    │     [Confirmar rota]
    │         │
    │         ▼
    │     [Tela de Navegação Ativa]
    │     ├── Header: Origem → Destino
    │     ├── Card: Tempo + chegada + estações
    │     └── Progress bar vertical com estações
    │
    └──── [Sem internet]
              │
              ▼
          [Banner offline + dados em cache]
```

---

## 7. ESTADOS DE INTERFACE

### Estado: Sem internet
- Banner no topo da tela: fundo `#FFF3E0`, ícone WiFi off, texto "Sem conexão — dados em cache"
- Funcionalidades disponíveis: rota em cache, mapa em cache
- Funcionalidades indisponíveis: feed de alertas, tarifa em tempo real

### Estado: Localização negada
- Mapa centraliza em Santiago (fallback)
- Banner informativo: "Ative a localização para melhores rotas"
- Funcionalidade de busca continua disponível

### Estado: API indisponível
- Toast na base da tela: "Serviço temporariamente indisponível"
- Dados em cache permanecem visíveis
- Botão "Tentar novamente" no toast

### Estado: Carregando rota
- Skeleton loader no card de resumo
- Indicador de progresso na barra de navegação superior

### Estado: Sem rota disponível
- Card de erro no lugar do card de resumo
- Ícone de alerta + "Rota não disponível para esta combinação"
- Sugestão de linhas alternativas

---

## 8. ANIMAÇÕES E TRANSIÇÕES

| Elemento | Tipo | Duração | Easing |
|---------|------|---------|--------|
| Sidebar abrir | Slide from left | 280ms | ease-out |
| Sidebar fechar | Slide to left | 220ms | ease-in |
| Card aparecer | Fade + slide up | 200ms | ease-out |
| Estação atual (highlight) | Pulse suave | 2s | ease-in-out, infinite |
| Bolinha de status online | Pulse | 3s | ease-in-out, infinite |
| Badge de tarifa (troca) | Cross-fade | 400ms | ease-in-out |
| Bottom sheet | Spring | 350ms | spring(stiffness:300) |

---

## 9. ICONOGRAFIA

Usar **Tabler Icons** (outline, não filled) para consistência.

| Contexto | Ícone sugerido |
|---------|----------------|
| Menu hambúrguer | `ti-menu-2` |
| Busca | `ti-search` |
| GPS / Localização | `ti-current-location` |
| Configurações | `ti-settings` |
| Fechar | `ti-x` |
| Alerta | `ti-alert-triangle` |
| Informação | `ti-info-circle` |
| Seta de direção | `ti-arrow-right` |
| Baldeação de linha | `ti-transfer` |
| Relógio / ETA | `ti-clock` |
| Trem / Metro | `ti-train` |
| Sem internet | `ti-wifi-off` |
| Privacidade | `ti-shield` |
| Perfil | `ti-user-circle` |

---

## 10. ESPECIFICAÇÕES MOBILE

### Safe Areas
- **Top:** 52px (status bar + padding)
- **Bottom:** 34px (home indicator no iOS)
- **Lateral:** 16px

### Touch Targets
- Tamanho mínimo: 44x44px (Apple HIG / Material)
- Espaçamento mínimo entre targets tocáveis: 8px

### Scroll
- Sidebar: scroll vertical em seções de linhas e feed
- Progress bar de navegação: scroll vertical, estação atual sempre visível (sticky behavior)
- Feed de alertas: scroll vertical dentro da seção

---

## 11. ACESSIBILIDADE

- Contraste mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande)
- Tamanho de fonte mínimo: 11px
- Suporte a Dynamic Type (iOS) / Font Scale (Android)
- Cores nunca como único indicador de estado — sempre acompanhar com ícone ou texto
- Labels de acessibilidade em todos os ícones interativos

---

## 12. COMPONENTES A CRIAR NO FIGMA

### Atoms
- [ ] Color Styles (todas as cores deste documento)
- [ ] Text Styles (hierarquia tipográfica)
- [ ] Icon set (Tabler outline)
- [ ] Chip de linha (L1–L6, variantes compacto e expandido)
- [ ] Badge de status (Normal, Atraso, Alerta, Suspenso)
- [ ] Badge de tarifa (Punta, Valle, Bajo)
- [ ] Bolinha de status (Online, Offline)
- [ ] Avatar placeholder

### Molecules
- [ ] Item de linha na sidebar
- [ ] Item de alerta no feed
- [ ] Estação na progress bar (3 estados: percorrida, atual, futura)
- [ ] Chip de baldeação
- [ ] Card de resumo de navegação
- [ ] Barra de busca
- [ ] Toggle de idioma

### Organisms
- [ ] Header da Sidebar
- [ ] Banner de Tarifa Dinâmica
- [ ] Seção de Linhas (com lista)
- [ ] Feed de Alertas (com filtros)
- [ ] Seletor de Idioma + Configurações
- [ ] Sidebar completa
- [ ] Progress Bar de Navegação
- [ ] Tela Home (mapa + busca)
- [ ] Tela de Navegação Ativa

### Templates / Telas
- [ ] Home
- [ ] Sidebar aberta
- [ ] Busca de destino
- [ ] Preview de rota (com tarifa)
- [ ] Navegação ativa
- [ ] Configurações
- [ ] Tela de consentimento LGPD
- [ ] Tela de erro / sem internet

---

*Movia Design Report — gerado em 2026 para referência interna*