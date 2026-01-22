module "apis" {
  source     = "./modules/apis"
  project_id = var.project_id
}

module "iam" {
  source            = "./modules/iam"
  project_id        = var.project_id
  github_repo_owner = var.github_repo_owner
  github_repo_name  = var.github_repo_name

  depends_on = [module.apis]
}

module "artifact_registry" {
  source     = "./modules/artifact_registry"
  project_id = var.project_id
  region     = var.region

  depends_on = [module.apis]
}

module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id

  depends_on = [module.apis]
}

module "cloud_run_control_plane" {
  source                = "./modules/cloud_run"
  project_id            = var.project_id
  region                = var.region
  service_name          = "control-plane"
  # Placeholder image, will be replaced by CI/CD
  image                 = "us-docker.pkg.dev/cloudrun/container/hello"
  service_account_email = module.iam.cloud_run_sa_email

  env_vars = {
    NODE_ENV = "production"
  }

  secret_env_vars = [
    {
      name   = "DATABASE_URL"
      secret = "control-plane-db-url"
    },
    {
      name   = "CLOUDFLARE_API_TOKEN"
      secret = "cloudflare-api-token"
    }
  ]

  depends_on = [module.apis, module.iam, module.artifact_registry, module.secrets]
}

module "cloudflare" {
  source                    = "./modules/cloudflare"
  account_id                = var.cloudflare_account_id
  zone_id                   = var.cloudflare_zone_id
  domain_name               = var.domain_name
  control_plane_service_url = module.cloud_run_control_plane.service_url
}
