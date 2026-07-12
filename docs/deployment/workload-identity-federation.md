# Workload Identity Federation (WIF)

Como o CI se autentica no Google Cloud **sem nenhuma chave de longa duração**.

## O problema que resolve

A forma tradicional de dar acesso ao GCP a um CI é criar uma chave JSON de
service account e guardá-la como secret. Isso tem um problema estrutural: a
chave é um segredo permanente. Se vazar (log, fork, commit acidental), o
atacante tem acesso até alguém revogar manualmente — e chaves vazadas
costumam passar despercebidas por muito tempo.

## Como o Movia faz

O GitHub Actions emite um token OIDC a cada execução, que prova a identidade
do workflow (repositório, branch, workflow). O GCP confia nesse token via um
Workload Identity Pool e o troca por uma credencial temporária.

Resultado: **não existe chave para vazar.** A credencial dura minutos, é
emitida sob demanda e está restrita a este repositório.

## Configuração atual

Os valores ficam em **Variables** (não Secrets) — são identificadores
públicos, e a segurança vem da federação, não do sigilo dos nomes:

| Variable | Valor |
|---|---|
| `GCP_WIF_PROVIDER` | `projects/509972004988/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider` |
| `GCP_DEPLOYER_SA` | `github-actions-deployer@project-d1495bcf-fa0b-400c-bdb.iam.gserviceaccount.com` |

Uso no workflow (`.github/workflows/deploy-staging.yml`):

```yaml
permissions:
  id-token: write   # necessário para o GitHub emitir o token OIDC
  contents: read

steps:
  - name: Authenticate to GCP
    uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
      service_account: ${{ vars.GCP_DEPLOYER_SA }}
```

## Permissões da service account de deploy

`github-actions-deployer` tem apenas o necessário para o deploy:

- `roles/run.admin` — atualizar o serviço Cloud Run
- `roles/artifactregistry.writer` — publicar a imagem Docker

Não tem acesso ao banco, aos secrets de aplicação nem a permissões amplas de
projeto.

## Verificação

```bash
# Variables configuradas
gh variable list

# Pool e provider existem
gcloud iam workload-identity-pools list --location=global
```

O Security Gate também valida a presença dessas variables a cada execução,
falhando cedo com mensagem clara se alguma sumir.
