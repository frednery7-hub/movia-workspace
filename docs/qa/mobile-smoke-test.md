# Smoke Test Manual — Mobile

Checklist mínimo antes de considerar um APK pronto para teste/distribuição.

## Abertura

- [ ] App abre sem crash
- [ ] Banner anima
- [ ] Cidade/região aparece corretamente
- [ ] Estação próxima aparece automaticamente, ou estado manual aparece
      quando localização é negada

## Permissões

- [ ] Localização permitida → busca/rota funcionam com origem automática
- [ ] Localização negada → busca manual continua disponível, sem bloquear o app
- [ ] Notificação permitida
- [ ] Notificação negada → app continua funcional
- [ ] Política de Privacidade abre e mostra as 12 seções
- [ ] Novo consentimento (reaceite) preserva as escolhas anteriores de
      localização/analytics, não reseta para padrão

## Busca

- [ ] Buscar por nome de estação
- [ ] Buscar por rua/endereço
- [ ] Buscar por ponto de referência conhecido (ex: Costanera Center)
- [ ] Resultado mostra a estação mais próxima como destino real,
      endereço como contexto visual

## Rota

- [ ] Calcular rota sem baldeação
- [ ] Calcular rota com baldeação — confirmar que a estação de
      transferência aparece corretamente na timeline (não "salta" de
      linha sem indicação)
- [ ] ETA exibido inclui espera estimada de baldeação quando aplicável
- [ ] Rota alternativa aparece apenas quando há vantagem clara, com
      motivo traduzido no idioma ativo (não em espanhol fixo)
- [ ] Timeline anima, gradiente por linha aparece
- [ ] Aviso antes de baldeação aparece
- [ ] Aviso antes do destino aparece
- [ ] Acesso/saída de estação aparece quando há dado cadastrado
      (cobertura de dados ainda limitada — não esperar em toda estação)

## Persistência

- [ ] Fechar o app durante viagem ativa e reabrir — progresso é
      restaurado corretamente, sem repetir avisos já disparados

## Idioma

- [ ] Nenhuma tela mistura idiomas (pt-BR / es-CL / en)
- [ ] Textos de rota alternativa e timeline respeitam o idioma ativo

## APK

- [ ] Confirmar versão do app
- [ ] Confirmar que `EXPO_PUBLIC_API_URL` aponta para staging, não `10.0.2.2`
- [ ] Confirmar SHA-256 registrado

Qualquer falha encontrada aqui deve virar item de correção antes do
APK ser considerado pronto.
