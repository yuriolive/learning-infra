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

resource "cloudflare_pages_project" "storefront" {
  account_id        = var.account_id
  name              = "storefront"
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = ".next"
    root_dir        = "apps/storefront"
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
# Note: Wildcard custom domains on Pages require Enterprise or Custom Hostnames (SaaS).
# Assuming we are using Cloudflare for SaaS (Custom Hostnames) pointing to a fallback origin.
# The doc says: "Set Fallback Origin to your storefront URL: storefront.pages.dev"
# And then add CNAME *.my -> storefront.pages.dev

resource "cloudflare_record" "wildcard_my" {
  zone_id = var.zone_id
  name    = "*.my"
  value   = "${cloudflare_pages_project.storefront.name}.pages.dev"
  type    = "CNAME"
  proxied = true
}

# Control Plane API (control.vendin.store -> ghs.googlehosted.com)
# Requires extracting the hostname from the service URL or mapping it manually.
# Since Cloud Run custom domains map to ghs.googlehosted.com, we use that.

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
