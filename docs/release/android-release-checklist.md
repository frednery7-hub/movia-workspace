# Checklist de Build/Release — Android

Checklist fixo para gerar um APK de release sem erro de ambiente.
Seguir em ordem; não pular etapas.

## 1. Pré-requisitos

- [ ] Branch correta (`git branch --show-current`)
- [ ] `git status --short` limpo, ou só com alterações esperadas e já entendidas
- [ ] `JAVA_HOME` apontando para JDK 17 (`/usr/libexec/java_home -v 17`)

## 2. Validação de código

```bash
cd ~/Desktop/movia-workspace

pnpm --filter mobile typecheck
pnpm --filter mobile lint
pnpm --filter mobile test

pnpm --filter backend build
pnpm --filter backend lint
pnpm --filter backend test
```

- [ ] Todos os comandos acima passam sem erro

## 3. Backend staging ativo

```bash
curl -s https://movia-backend-staging-509972004988.southamerica-east1.run.app/health
```

- [ ] Retorna `200 OK`

## 4. Variáveis de ambiente do build

- [ ] `apps/mobile/.env` tem `EXPO_PUBLIC_API_URL` apontando para o backend de
      **staging** (`https://movia-backend-staging-509972004988.southamerica-east1.run.app`)
      — **nunca** `http://10.0.2.2:3000` num APK de release
- [ ] `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` definida

## 5. Gerar o APK

```bash
cd ~/Desktop/movia-workspace/apps/mobile

export JAVA_HOME=$(/usr/libexec/java_home -v 17)
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease --no-daemon
```

- [ ] Build termina com `BUILD SUCCESSFUL`

## 6. Copiar e verificar o artefato

```bash
cd ~/Desktop/movia-workspace/apps/mobile/android
cp app/build/outputs/apk/release/app-release.apk ~/Desktop/Movia-release.apk
shasum -a 256 ~/Desktop/Movia-release.apk
```

- [ ] APK copiado para o Desktop
- [ ] SHA-256 gerado e registrado (changelog/release notes)

## 7. Teste manual no celular

Ver checklist completo em `docs/qa/mobile-smoke-test.md`. No mínimo:

- [ ] App abre sem crash
- [ ] Busca por estação funciona
- [ ] Busca por endereço/local funciona
- [ ] Cálculo de rota funciona
- [ ] Política de privacidade abre e consentimento funciona

## Nota sobre assinatura

Este checklist gera um APK assinado com a **keystore de debug** padrão do Expo —
adequado para testes internos, não para distribuição em loja. Gerar uma keystore
de produção é um item separado, ainda pendente.
