# Data sources: Terraform los consulta en cada plan/apply para conocer el
# estado actual de AWS. No crean nada — solo leen.

# AMI más reciente de Amazon Linux 2023 (x86_64).
# Cambia con frecuencia (parches de seguridad), por eso preferimos
# resolverla dinámicamente en cada apply en vez de hardcodear un ID.
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# VPC default de la región. Cada cuenta nueva de AWS la trae creada.
# Usar la default mantiene este módulo simple y sin costos extra
# (NAT gateways, route tables custom, etc.).
data "aws_vpc" "default" {
  default = true
}

# Subredes públicas de la VPC default. La instancia se lanzará en una
# de ellas para tener IP pública directa.
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
