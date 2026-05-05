# Recursos de cómputo: instancia EC2 + Elastic IP.

# Instancia EC2 que correrá el contenedor Docker de la app.
resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = var.instance_type

  # Lanza la instancia en la primera subred default disponible.
  # `tolist(...)[0]` convierte el set de IDs a lista y toma el primero.
  subnet_id              = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids = [aws_security_group.app.id]

  # IP pública directa (además de la Elastic IP que se asocia abajo).
  associate_public_ip_address = true

  # Script de bootstrap. `templatefile` interpola las variables ${...}
  # del script con los valores que pasamos aquí.
  user_data = templatefile("${path.module}/user_data.sh", {
    project_name   = var.project_name
    github_repo    = var.github_repo
    github_branch  = var.github_branch
    app_dir        = var.app_dir
    container_port = var.container_port
    host_port      = var.host_port
  })

  # Si cambia el contenido del user_data, AWS recrea la instancia
  # en vez de actualizarla in-place (que no funcionaría — user_data
  # solo corre al primer boot).
  user_data_replace_on_change = true

  # Disco raíz: 8GB gp3 (free tier permite hasta 30GB EBS).
  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name = var.project_name
  }
}
