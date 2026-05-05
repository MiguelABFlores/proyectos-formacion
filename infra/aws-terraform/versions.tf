# Versiones requeridas de Terraform y de los providers.
#
# Usamos `~>` para fijar la versión menor: aceptamos parches automáticos
# (5.70.x → 5.70.y) pero NO saltos de versión menor (5.71+) que podrían
# introducir cambios incompatibles.
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}
