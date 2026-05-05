# Configuración del provider AWS.
#
# Las credenciales NO se hardcodean aquí. Terraform las descubre
# automáticamente del entorno, en este orden de prioridad:
#   1. Variables de entorno: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
#   2. ~/.aws/credentials (creado con `aws configure`)
#   3. IAM role asociado a la máquina (cuando se ejecuta dentro de AWS)
#
# Tags por defecto: cualquier recurso que soporte tags hereda estos.
# Sirve para filtrar costos y limpiar recursos huérfanos.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}
