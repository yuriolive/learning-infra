variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "apis" {
  description = "List of APIs to enable"
  type        = list(string)
  default = [
    "iamcredentials.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "run.googleapis.com",
    "cloudresourcemanager.googleapis.com", # Required for project bindings
    "iam.googleapis.com" # Required for service accounts
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(var.apis)

  project = var.project_id
  service = each.key

  disable_on_destroy = false
}
