# ─────────────────────────────────────────────────────────────────
# Artifact Registry — repositorio Docker
# ─────────────────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "movia_backend" {
  location      = var.region
  repository_id = var.artifact_registry_repo
  format        = "DOCKER"
  description   = "Imagens Docker do backend Movia"
}

# ─────────────────────────────────────────────────────────────────
# Secret Manager — apenas os NOMES dos secrets, sem valores.
# Os valores reais sao inseridos fora do Terraform (gcloud secrets
# versions add), nunca commitados.
# ─────────────────────────────────────────────────────────────────
resource "google_secret_manager_secret" "backend_secrets" {
  for_each  = toset(var.secret_names)
  secret_id = each.value

  replication {
    auto {}
  }
}

# ─────────────────────────────────────────────────────────────────
# IAM — permite que a service account de runtime do Cloud Run
# acesse os secrets acima.
# ─────────────────────────────────────────────────────────────────
data "google_project" "current" {
  project_id = var.project_id
}

locals {
  runtime_service_account = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "backend_secret_access" {
  for_each  = google_secret_manager_secret.backend_secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.runtime_service_account}"
}

# ─────────────────────────────────────────────────────────────────
# Cloud Run — backend de staging.
#
# Espelha a configuracao real confirmada via `gcloud run services
# describe` em 2026-06-27: 1 CPU, 1Gi memoria, concorrencia 80,
# max 5 instancias, timeout 300s, service account padrao do
# Compute Engine.
# ─────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "backend_staging" {
  name     = var.cloud_run_service
  location = var.region

  template {
    service_account                  = local.runtime_service_account
    timeout                          = "300s"
    max_instance_request_concurrency = 80

    scaling {
      max_instance_count = 5
    }

    containers {
      image = var.cloud_run_image

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      dynamic "env" {
        for_each = google_secret_manager_secret.backend_secrets
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}
