# ADR-006 — Workload Identity Federation em vez de chaves de service account

**Status:** Aceito
**Data:** 2026-06-27

## Contexto

O CI precisa publicar imagens no Artifact Registry e atualizar o serviço no
Cloud Run. A forma tradicional de conceder esse acesso é criar uma chave
JSON de service account e guardá-la como secret no GitHub.

O problema dessa abordagem é estrutural: a chave é um **segredo permanente**.
Se vazar — num log, num fork, num commit acidental — o acesso permanece
válido até alguém revogar manualmente. Chaves vazadas costumam passar
despercebidas por muito tempo.

## Decisão

Usar **Workload Identity Federation**. O GitHub Actions emite um token OIDC
por execução, provando a identidade do workflow (repositório, branch). O GCP
confia nesse token através de um Workload Identity Pool e o troca por uma
credencial temporária.

Não existe chave para vazar: a credencial dura minutos, é emitida sob demanda
e está restrita a este repositório.

A service account de deploy (`github-actions-deployer`) tem apenas
`roles/run.admin` e `roles/artifactregistry.writer` — sem acesso ao banco,
aos secrets da aplicação ou a permissões amplas de projeto.

## Alternativas consideradas

**Chave JSON como secret do GitHub.** Rejeitada pelo motivo acima: segredo
permanente, revogação manual, vazamento silencioso.

**Deploy manual apenas.** Rejeitada: não escala e depende de uma máquina
específica com credenciais locais.

## Consequências

**Positivas:**
- Nenhuma credencial de longa duração existe para ser vazada.
- O acesso é escopado ao repositório pela federação.
- Menor privilégio na SA de deploy.

**Negativas / aceitas:**
- Configuração inicial mais complexa que colar uma chave num secret (exige
  pool, provider e binding de IAM).
- Depende do provedor de OIDC do GitHub estar disponível.

## Detalhes de configuração

Ver `docs/deployment/workload-identity-federation.md`.
