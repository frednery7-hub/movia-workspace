# Terraform — Movia Backend (Santiago)

Infraestrutura como código para o backend do Movia em staging (GCP).

## O que este Terraform cobre

- Artifact Registry (repositório Docker)
- Secret Manager (apenas nomes dos secrets, nunca valores)
- IAM (acesso da service account de runtime aos secrets)
- Cloud Run (serviço de staging)

## O que este Terraform NÃO cobre ainda

- AWS RDS (banco de dados de Santiago) — provider separado, fora de escopo deste módulo
- Qualquer recurso do Movia Brasil (desprovisionado em 2026-06-27)
- Monitoramento/alertas
- CI/CD (já existe via GitHub Actions, ver `.github/workflows/`)

## Importante — recursos já existem

Os recursos que este Terraform descreve **já existem no GCP**, criados manualmente
antes deste módulo. Rodar `terraform apply` diretamente, sem um passo de import,
tentaria recriar recursos já existentes e provavelmente falharia ou causaria conflito.

**Antes de qualquer `apply` real, é necessário importar os recursos existentes**, ex:

```bash
terraform import google_cloud_run_v2_service.backend_staging \
  projects/PROJECT_ID/locations/REGION/services/movia-backend-staging

terraform import google_artifact_registry_repository.movia_backend \
  projects/PROJECT_ID/locations/REGION/repositories/movia-backend

terraform import 'google_secret_manager_secret.backend_secrets["DATABASE_URL"]' \
  projects/PROJECT_ID/secrets/DATABASE_URL
# repetir para cada secret em var.secret_names
```

Até esse import ser feito e revisado com cuidado (`terraform plan` mostrando
"no changes"), **não rodar `terraform apply`** neste módulo.

## Secrets

Os valores dos secrets nunca ficam neste repositório. Depois que o Terraform
criar os nomes dos secrets (ou eles forem importados), os valores são inseridos
manualmente:

```bash
echo -n "valor-real-aqui" | gcloud secrets versions add JWT_SECRET --data-file=-
```

## Como usar

```bash
cd infra/terraform
cp environments/staging.tfvars.example environments/staging.tfvars
# editar staging.tfvars com os valores reais

terraform init
terraform fmt -check
terraform validate

# Import dos recursos existentes (ver seção acima) antes de qualquer plan/apply real
terraform plan -var-file=environments/staging.tfvars
```

## Por que não criar valores reais aqui

Terraform state e arquivos `.tf` commitados no Git **não são lugar seguro para
segredos**. Os secrets são gerenciados via Secret Manager, com os valores
inseridos fora do versionamento.
