# Variables de entrada del módulo.
#
# Cada variable declara `description` (qué hace), `type` (validación)
# y `default` (valor seguro). Para sobreescribir alguna, copiar
# `terraform.tfvars.example` a `terraform.tfvars` y editar ahí.

variable "aws_region" {
  description = "Región de AWS donde se despliega la app."
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Tipo de instancia EC2. t3.micro es elegible para free tier."
  type        = string
  default     = "t3.micro"
}

variable "project_name" {
  description = "Nombre del proyecto. Se usa en tags y como nombre del contenedor Docker."
  type        = string
  default     = "tabla-periodica-biblia"
}

variable "github_repo" {
  description = "URL HTTPS del repo a clonar dentro de la instancia."
  type        = string
  default     = "https://github.com/MiguelABFlores/proyectos-formacion.git"
}

variable "github_branch" {
  description = "Rama del repo que se clona y construye."
  type        = string
  default     = "main"
}

variable "app_dir" {
  description = "Subdirectorio dentro del repo donde está el Dockerfile de la app."
  type        = string
  default     = "tabla-periodica-biblia/app"
}

variable "container_port" {
  description = "Puerto interno donde escucha la app dentro del contenedor."
  type        = number
  default     = 3000
}

variable "host_port" {
  description = "Puerto público de la instancia EC2 que se mapea al contenedor."
  type        = number
  default     = 80
}
