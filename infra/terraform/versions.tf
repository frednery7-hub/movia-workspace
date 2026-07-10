terraform {
  required_version = ">= 1.5.0"

  # Backend remoto: state no GCS, criptografado em repouso e versionado.
  # Resolve o item B2 da auditoria (state local sem protecao).
  # A senha do banco vive no state -- este bucket tem acesso uniforme,
  # prevencao de acesso publico e versionamento para recuperacao.
  backend "gcs" {
    bucket = "movia-terraform-state-project-d1495bcf-fa0b-400c-bdb"
    prefix = "staging"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
