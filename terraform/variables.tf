variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "vendin-store"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "southamerica-east1"
}

variable "github_repo_owner" {
  description = "The GitHub repository owner"
  type        = string
  default     = "yuriolive"
}

variable "github_repo_name" {
  description = "The GitHub repository name"
  type        = string
  default     = "vendin"
}
