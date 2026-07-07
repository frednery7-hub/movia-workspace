# Riscos de Segurança Aceitos

Vulnerabilidades de dependências aceitas deliberadamente, com justificativa e
data de revisão. **Toda exceção aqui precisa ter justificativa e revisão
periódica — exceção sem justificativa ou permanente não é permitida.**

## tar (via @expo/cli)

**Aceito em**: 2026-06-27
**Revisar em**: a cada atualização do `@expo/cli`/`expo` ou do pnpm para v11+
**Status**: aceito, com `pnpm.auditConfig.ignoreCves` no `package.json` raiz

### Vulnerabilidades ignoradas

| CVE | GHSA | Severidade | Descrição |
|---|---|---|---|
| CVE-2026-24842 | GHSA-34x7-hfp2-rc4v | High | Hardlink path traversal |
| CVE-2026-23745 | GHSA-8qq5-rm4j-mr97 | High | Arbitrary file overwrite / symlink poisoning |
| CVE-2026-26960 | GHSA-83g3-92jg-28cx | High | Hardlink target escape via symlink chain |
| CVE-2026-29786 | GHSA-qffp-2rhf-9h96 | High | Hardlink path traversal via drive-relative linkpath |
| CVE-2026-31802 | GHSA-9ppj-qmqm-q256 | High | Symlink path traversal via drive-relative linkpath |
| CVE-2026-23950 | GHSA-r6q2-hw4h-h46w | High | Race condition via Unicode ligature collisions (macOS APFS) |
| CVE-2026-53655 | GHSA-vmf3-w455-68vh | Moderate | PAX size override / tar parser interpretation differential |

### Justificativa

`@expo/cli@0.22.28` declara `tar@^6.2.1` como dependência interna. O resto do
workspace usa `tar` v7 (corrigido). Um override (`@expo/cli>tar: ^6.2.1`) é
necessário porque sem ele, `expo prebuild` falha com
`Cannot read properties of undefined (reading 'extract')` — incompatibilidade
de API entre as major versions.

`tar@6.2.1` herda as 7 vulnerabilidades acima (todas relacionadas a extração
de arquivos `.tar` maliciosos via hardlink/symlink/path traversal).

**Por que o risco é baixo neste caso específico**: esse `tar` só é executado
localmente, pelo `@expo/cli`, ao extrair o template `expo-template-bare-minimum`
durante `expo prebuild` — um pacote oficial do Expo, baixado do registry npm
público durante uma tarefa de tooling de desenvolvimento. Não processa arquivos
de usuário, não roda em produção, não está no APK final, não roda no backend.

**Vetor de ataque residual**: comprometimento de supply-chain no registry npm
(o próprio pacote do template seria malicioso), não exploração via input do
usuário ou de rede.

### Quando remover esta exceção

- Quando `@expo/cli` atualizar sua dependência interna de `tar` para v7+, ou
- ✅ **pnpm migrado para v11.10.0 em 2026-07-07** — `ignoreCves` migrado para
  `ignoreGhsas` no `pnpm-workspace.yaml` (novo padrão do pnpm 11)
