resource "neon_project" "main" {
  name = "vendin-control-plane"
}

output "project_id" {
  value = neon_project.main.id
}
