variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "secrets" {
  description = "List of secrets to create"
  type        = list(string)
  default     = ["control-plane-db-url"]
}

resource "google_secret_manager_secret" "secrets" {
  for_each = toset(var.secrets)

  secret_id = each.key
  project   = var.project_id

  labels = {
    environment = "production"
    service     = "control-plane"
  }

  replication {
    auto {}
  }
}

# Add a dummy version to the secret so it can be used immediately
resource "google_secret_manager_secret_version" "secret_version" {
  for_each = google_secret_manager_secret.secrets
  secret = each.value.id
  secret_data = "change-me"
}
