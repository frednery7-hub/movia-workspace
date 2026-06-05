# Movia — Design Refinement Brief v2.0
> Direção para evoluir do protótipo para produto real
> Referências: Apple Maps (suavidade) + Google Maps (clareza) + Citymapper (energia)

---

## PRINCÍPIO CENTRAL

> O mapa é o protagonista. Os painéis ajudam sem roubar a cena.
> O app precisa respirar. Cada elemento existe por um motivo.

---

## 1. MAPA MAIS RICO

### Problema atual
Mapa simulado: linhas simples, fundo cinza, poucos pontos. Parece mockup.

### Direção v2
- **Fundo:** tiles com ruas leves visíveis (baixo contraste, tons neutros quentes)
- **Linhas do metrô:** mais espessas, com bordas suaves, levemente arredondadas nas curvas
- **Estações:** marcadores pequenos com círculo branco + borda colorida da linha
- **Nomes:** exibir nome da estação em fontes pequenas (11px) próximo ao marcador
- **Profundidade:** camada de mapa → camada de linhas → camada de UI (3 planos distintos)
- **Sensação:** Google Maps estilo trânsito — colorido onde importa, neutro onde não importa

---

## 2. PALETA REVISADA

### Problema atual
Branco + cinza + vermelho. Funciona, mas parece fria e sem vida.

### Paleta v2

| Token | Hex | Uso |
|-------|-----|-----|
| `accent-primary` | `#E31837` | Cor Movia — destaque, CTA, estação atual |
| `action-blue` | `#1A73E8` | Localização, ações do usuário, botão GPS |
| `status-green` | `#1E8A3C` | Status normal, operação OK (mais saturado) |
| `alert-amber` | `#F59E0B` | Alertas, atrasos leves |
| `alert-red` | `#DC2626` | Falha, emergência |
| `bg-warm` | `#F7F5F2` | Fundo dos painéis (neutro quente, não branco puro) |
| `surface` | `#FFFFFF` | Cartões e elementos elevados |
| `text-primary` | `#111827` | Texto principal (não preto puro) |
| `text-secondary` | `#6B7280` | Texto auxiliar |
| `text-tertiary` | `#9CA3AF` | Timestamps, labels inativas |
| `border` | `#E5E7EB` | Divisores sutis |

### Regra de uso de cor
- Vermelho Movia: apenas para estação atual e ações críticas
- Azul: sempre que indicar posição/navegação do usuário
- Verde: status operacional positivo
- Âmbar: alertas que não impedem uso
- Tons quentes: backgrounds e superfícies (nunca branco puro)

---

## 3. CARTÕES MAIS LEVES

### Problema atual
Excesso de blur, sombra densa e borda muito arredondada. Parece pesado.

### Direção v2
```
Antes:
  border-radius: 18px
  box-shadow: 0 6px 20px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03)
  background: linear-gradient(135deg, #fff 0%, #f9f9f9 100%)

Depois:
  border-radius: 12px
  box-shadow: 0 2px 8px rgba(0,0,0,0.06)
  background: #FFFFFF
  border: 1px solid #E5E7EB
```

### Regras de cartão
- Blur (backdropFilter) apenas na SearchBar e elementos sobre o mapa — máximo 1 por tela
- Sombras sutis, nunca em cascata
- Gradientes apenas em headers escuros (sidebar, nav ativa)
- Raio padrão: 12px (cards), 8px (chips), 6px (badges)

---

## 4. TIPOGRAFIA REFINADA

### Hierarquia v2

| Nível | Size | Weight | Color | Uso |
|-------|------|--------|-------|-----|
| Display | 28–32px | 700 | `#111827` | ETA, tempo estimado |
| Title | 18–20px | 700 | `#111827` | Headers de tela |
| Subtitle | 15–16px | 600 | `#111827` | Nome do destino, estação atual |
| Body | 14px | 400 | `#111827` | Textos gerais |
| Secondary | 13px | 400 | `#6B7280` | Descrições, alertas |
| Caption | 11–12px | 500 | `#9CA3AF` | Timestamps, labels de estado |

### Regras tipográficas
- Máximo 3 pesos diferentes por tela (400, 600, 700)
- Letter-spacing negativo apenas em Display e Title (-0.02em a -0.03em)
- Line-height: 1.4 para Body, 1.2 para Display
- Nunca usar 500 (medium) como peso principal — usar 400 ou 600

---

## 5. MICRO-INTERAÇÕES

### Marcador de localização do usuário
```
Ponto azul central: 12px, #1A73E8
Halo: 40px, #1A73E8 com 15% opacidade
Animação: Animated.loop — escala 1.0→1.3→1.0, duration 2000ms
```

### Sidebar — spring animation
```
Entrada: translateX(-100%) → translateX(0)
Duration: 350ms
Easing: spring (tension: 300, friction: 30)
Overlay: fade 0→0.4 sincronizado
```

### StatusBadge — transição de estado
```
Ao mudar de NORMAL→DELAYED:
  opacity: 1→0→1 (200ms)
  backgroundColor: cross-fade suave
```

### Botão "Ir" / confirmar rota
```
Press: escala 1.0→0.96 (100ms)
Release: escala 0.96→1.02→1.0 (spring, 200ms)
Background: pulso de opacidade 1→0.8→1 após confirmar
```

### Estação atual na NavigationProgress
```
Remoção da animação de "translateX" — muito sutil
Substituir por: brilho leve no background (#ffebee → #fff5f5 → #ffebee)
Duration: 3000ms, loop infinito
```

---

## 6. SIDEBAR MAIS ESCANEÁVEL

### Problema atual
Informação densa em sequência. Difícil escanear rapidamente.

### Estrutura v2

**Header** (sem mudança — está bom)

**Banner de tarifa** (compactar)
- Altura: 40px (era 52px)
- Mostrar: ícone + nome + horário em linha única
- Remover padding excessivo

**Seção Linhas — novo layout**
```
Antes: [chip L1] [nome "Línea 1"] [badge status]
Depois: [chip L1] [nome] [● verde/laranja/vermelho]  ← ponto de cor + label só no hover
```
- Status como ponto colorido de 8px, não badge completo
- Badge completo apenas quando status ≠ NORMAL
- Isso comprime visualmente: o usuário vê rapidamente "tudo verde" ou "tem problema"

**Seção Ocorrências**
- Título da ocorrência em negrito (14px, 600)
- Texto em 13px, 400, máx 2 linhas
- Timestamp em 11px à direita, não abaixo
- Badges com menos padding: 3px 8px (era 5px 10px)

**Agrupamento visual**
- Separador de seção: linha 1px + label uppercase + margem generosa
- Nunca colocar 2 seções densas sem respiro entre elas

---

## 7. IDIOMA CONSISTENTE

### Problema atual
Mistura de português e espanhol: `Línea`, `Operación normal`, `há 5 min`, `Configurações`.

### Decisão obrigatória (escolher uma):

**Opção A — Espanhol (Santiago/Chile como mercado principal)**
```
Línea 1, Línea 4          ← nome oficial do Metro de Santiago
Operación normal           ← status
hace 5 min                 ← timestamp
Configuración              ← settings
Para dónde?               ← search placeholder
Estás aquí                 ← you are here
```

**Opção B — Português (Brasil como mercado principal)**
```
Linha 1, Linha 4           ← traduzido
Operação normal            ← status
há 5 min                   ← timestamp
Configurações              ← settings
Para onde?                 ← search placeholder
Você está aqui             ← you are here
```

**Recomendação:** Opção A (Espanhol) para V1.0 com foco em Santiago. Português quando expandir para São Paulo (já tem `shared-data-saopaulo`). O sistema de i18n (ES/PT/EN) já existe no código.

---

## 8. COMPONENTES A REVISAR NO FIGMA

### Prioridade alta (impacto visual imediato)
- [ ] SearchBar — remover blur excessivo, simplificar sombra
- [ ] MoviaSidebar — novo layout de linhas com pontos de status
- [ ] StatusBadge — versão compacta (ponto 8px) + versão expandida (badge completo)
- [ ] Cards do NavigationProgress — raio 12px, sombra menor
- [ ] Paleta de cores — substituir tokens frios pelos quentes

### Prioridade média
- [ ] Marcador de localização — novo halo animado
- [ ] Seção de ocorrências na sidebar — layout mais respirado
- [ ] Botão "Ir" — spring animation
- [ ] Tipografia — revisar hierarquia em todas as telas

### Prioridade baixa (polish final)
- [ ] Ícones — revisar para Tabler outline com stroke 2px consistente
- [ ] Paddings — auditoria de espaçamento (múltiplos de 4px)
- [ ] Microinteração da sidebar

---

## REFERÊNCIAS VISUAIS

| Referência | O que copiar |
|-----------|-------------|
| **Apple Maps** | Glass sutil, tipografia hierárquica, mapa como protagonista |
| **Google Maps** | Cores funcionais, clareza de status, leitura imediata |
| **Citymapper** | Energia de transporte público, status vivos, confiança no dado |
| **Transit App** | Cards de linha enxutos, escalabilidade de informação |

---

## O QUE NÃO MUDAR

- Cores das linhas L1–L6 (são as cores oficiais do Metro de Santiago)
- Cores das tarifas Punta/Valle/Bajo (já aprovadas)
- Header escuro `#1a1a2e` da sidebar (forte e reconhecível)
- Estrutura geral de navegação (já aprovada e funcional)
- Progress bar vertical da NavigationProgress (diferencial visual do Movia)

---

*Movia Design Brief v2.0 — para implementação no Figma antes do teste de campo*