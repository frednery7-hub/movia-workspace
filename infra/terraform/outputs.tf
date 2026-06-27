output "cloud_run_url" {
  description = "URL publica do servico Cloud Run"
  value       = google_cloud_run_v2_service.backend_staging.uri
}

output "artifact_registry_repo_id" {
  description = "ID completo do repositorio no Artifact Registry"
  value       = google_artifact_registry_repository.movia_backend.id
}

output "runtime_service_account" {
  description = "Service account usada em runtime pelo Cloud Run"
  value       = local.runtime_service_account
}
