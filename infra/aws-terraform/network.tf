# Security group: firewall a nivel de instancia.
#
# Reglas:
#   - Ingress: solo HTTP (80) desde cualquier IP (IPv4 e IPv6).
#   - Sin SSH (22): la instancia es inmutable; para actualizar se recrea.
#   - Egress: cualquier salida (necesario para apt/dnf, git, docker pull).
#
# AWS no acepta caracteres no-ASCII en `description` de SG ni de sus reglas,
# por eso los textos van sin tildes.
resource "aws_security_group" "app" {
  name        = "${var.project_name}-sg"
  description = "Permite HTTP entrante en el puerto ${var.host_port}"
  vpc_id      = data.aws_vpc.default.id

  # HTTP desde IPv4 e IPv6.
  ingress {
    description      = "HTTP desde Internet"
    from_port        = var.host_port
    to_port          = var.host_port
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # Salida sin restriccion.
  egress {
    description      = "Permitir todo el trafico saliente"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}
