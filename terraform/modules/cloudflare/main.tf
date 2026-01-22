variable "account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
}

variable "control_plane_service_url" {
  description = "URL of the Control Plane Cloud Run service"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

resource "cloudflare_pages_project" "storefront" {
  account_id        = var.account_id
  name              = "storefront"
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = ".next"
    root_dir        = "apps/storefront"
  }

  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "all"
      preview_branch_includes       = ["*"]
      preview_branch_excludes       = ["main"]
    }
  }
}

resource "cloudflare_pages_domain" "root" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.storefront.name
  domain       = var.domain_name
}

resource "cloudflare_pages_domain" "www" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.storefront.name
  domain       = "www.${var.domain_name}"
}

resource "cloudflare_pages_domain" "admin" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.storefront.name
  domain       = "admin.${var.domain_name}"
}

# Wildcard DNS for tenant subdomains (*.my.vendin.store)
resource "cloudflare_record" "wildcard_my" {
  zone_id = var.zone_id
  name    = "*.my"
  value   = "${cloudflare_pages_project.storefront.name}.pages.dev"
  type    = "CNAME"
  proxied = true
}

# Control Plane API (control.vendin.store -> ghs.googlehosted.com)
resource "cloudflare_record" "control_plane" {
  zone_id = var.zone_id
  name    = "control"
  value   = "ghs.googlehosted.com"
  type    = "CNAME"
  proxied = false # DNS only for Cloud Run domain mapping verification usually required first
}

output "pages_project_name" {
  value = cloudflare_pages_project.storefront.name
}

output "pages_subdomain" {
  value = "${cloudflare_pages_project.storefront.name}.pages.dev"
}
