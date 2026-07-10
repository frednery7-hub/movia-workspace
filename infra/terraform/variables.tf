variable "project_id" {
  description = "ID do projeto GCP"
  type        = string
}

variable "region" {
  description = "Regiao GCP onde os recursos sao provisionados"
  type        = string
  default     = "southamerica-east1"
}

variable "artifact_registry_repo" {
  description = "Nome do repositorio Docker no Artifact Registry"
  type        = string
  default     = "movia-backend"
}

variable "cloud_run_service" {
  description = "Nome do servico Cloud Run do backend"
  type        = string
  default     = "movia-backend-staging"
}

variable "cloud_run_image" {
  description = "Imagem Docker completa a ser deployada (ex: REGION-docker.pkg.dev/PROJECT/REPO/IMAGE:TAG). Nao tem default de proposito -- deve ser passada explicitamente em cada apply/plan."
  type        = string
}

variable "db_user_password" {
  description = "Senha do usuario da aplicacao no Cloud SQL. Nunca commitar o valor: passar via TF_VAR_db_user_password ou tfvars local fora do git. Fica registrada no state -- use backend remoto criptografado."
  type        = string
  sensitive   = true
}

variable "secret_names" {
  description = "Nomes dos secrets no Secret Manager consumidos pelo backend. Os VALORES nunca ficam aqui -- sao inseridos fora do Terraform, via gcloud ou console."
  type        = list(string)
  default = [
    "DATABASE_URL",
    "JWT_SECRET",
    "GOOGLE_GEOCODING_API_KEY",
    "GOOGLE_PLACES_API_KEY",
    "METRICS_TOKEN",
  ]
}
