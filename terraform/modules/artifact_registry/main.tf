variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "repository_id" {
  description = "The ID of the artifact registry repository"
  type        = string
  default     = "containers"
}

resource "google_artifact_registry_repository" "containers" {
  provider      = google-beta
  location      = var.region
  repository_id = var.repository_id
  description   = "Container images for Vendin"
  format        = "DOCKER"
  project       = var.project_id
}

output "repository_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}"
}
