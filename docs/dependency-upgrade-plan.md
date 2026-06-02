# Movia — Plano de Atualização de Dependências
Data: Junho 2026 | Status: Dívida Técnica Documentada

## Situação Atual

`pnpm audit --prod` retorna **zero CVEs conhecidos em produção**.
Porém, há dependências com defasagem de major versions que representam
dívida técnica real antes de uma declaração de "produção selada".

## Dependências Defasadas

| Pacote | Atual | Última | Risco |
|--------|-------|--------|-------|
| Expo | 52 | 56 | Alto — 4 majors, breaking changes em APIs nativas |
| React Native | 0.76 | 0.85 | Alto — New Architecture changes |
| Expo Router | 4 | 5+ | Médio — mudanças de API de navegação |
| Prisma | 5 | 7 | Médio — breaking changes em client/schema |
| @nestjs/jwt | 10 | 11 | Baixo — peer dep com NestJS 11 já resolvida |
| @nestjs/passport | 10 | 11 | Baixo — peer dep com NestJS 11 já resolvida |
| React | 18 | 19 | Médio — concurrent features, breaking changes menores |

## Por que Não Bloqueia a Auditoria Atual

- Zero CVEs em produção confirmado via `pnpm audit --prod`
- Aplicação funcional e testada nas versões atuais
- Defasagem de versão ≠ vulnerabilidade ativa
- Projeto em estágio pré-produção / portfólio

## Riscos Reais

1. **Expo 52 → 56**: APIs de sensores, câmera e localização mudam entre majors.
   Pode quebrar `InertialService`, `LocationService` e `LocationFusion`.

2. **React Native 0.76 → 0.85**: New Architecture (JSI/Fabric) tem breaking changes
   em componentes nativos. `react-native-maps` e `react-native-reanimated`
   precisam de versões compatíveis.

3. **Prisma 5 → 7**: Client API mudou. Queries com `findUnique`, `createMany`
   podem ter comportamento diferente. Migrations precisam ser revisadas.

4. **@nestjs/jwt e @nestjs/passport**: Peer deps hoje geram warnings com
   NestJS 11. Funcionam, mas warnings no CI são ruído.

## Plano de Upgrade

### Sprint — Baixo risco (fazer antes do staging)
- [ ] `@nestjs/jwt` → 11
- [ ] `@nestjs/passport` → 11
- [ ] Resolver warnings de peer deps no CI

### Sprint — Médio risco (fazer antes de produção real)
- [ ] Prisma 5 → 7
  - Revisar client API breaking changes
  - Testar todas as queries em auth, privacy, eta, geo
  - Rodar migrations em ambiente de staging
- [ ] React 18 → 19
  - Testar componentes mobile

### Sprint — Alto risco (projeto dedicado)
- [ ] React Native 0.76 → 0.85
  - Testar sensores (IMU, GPS)
  - Testar react-native-maps
  - Testar react-native-reanimated
  - Testar expo-linear-gradient
- [ ] Expo 52 → 56 (depende de RN atualizado)
  - Seguir guia oficial de migração Expo
  - Testar em dispositivo físico iOS e Android
  - Testar permissões de localização
- [ ] Expo Router 4 → 5+
  - Revisar API de navegação
  - Testar fluxo: boot → consent → map → sidebar → settings

## Critério de "Produção Selada" para Dependências

O projeto pode ser declarado produção selada quando:
1. Zero CVEs em produção (já atendido ✅)
2. Nenhuma dependência com defasagem > 1 major version
3. Testes passando após cada upgrade major
4. Validação em dispositivo físico após upgrades mobile

## Nota para Recrutadores / Auditores

A defasagem documentada aqui é **dívida técnica planejada**, não negligência.
O projeto mantém zero CVEs e todos os testes passando nas versões atuais.
O plano de upgrade existe, está priorizado e será executado antes do
deploy em produção com usuários reais.
