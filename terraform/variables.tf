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

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (e.g., vendin.store)"
  type        = string
  default     = "vendin.store"
}

variable "neon_api_key" {
  description = "Neon API Key"
  type        = string
  sensitive   = true
}
