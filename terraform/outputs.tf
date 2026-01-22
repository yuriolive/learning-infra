output "github_actions_sa_email" {
  value = module.iam.github_actions_sa_email
}

output "cloud_run_sa_email" {
  value = module.iam.cloud_run_sa_email
}

output "wif_provider_name" {
  value = module.iam.wif_provider_name
}

output "artifact_registry_url" {
  value = module.artifact_registry.repository_url
}

output "control_plane_service_url" {
  value = module.cloud_run_control_plane.service_url
}
