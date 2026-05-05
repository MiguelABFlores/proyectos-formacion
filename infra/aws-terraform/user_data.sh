#!/bin/bash
# Script de bootstrap que corre cloud-init en el primer boot de la instancia.
#
# Logs visibles con:
#   aws ec2 get-console-output --instance-id <ID>
# o ya dentro de la instancia (si se habilita SSH temporalmente):
#   sudo cat /var/log/cloud-init-output.log
#
# Las variables ${...} las interpola Terraform vía templatefile() — NO son
# variables de bash. Si necesitas variables de bash, escápalas con $$.

# -e: aborta si algún comando falla
# -u: aborta si se usa una variable sin definir
# -x: imprime cada comando antes de ejecutarlo (debugging)
# -o pipefail: detecta fallos en cualquier parte de un pipe
set -euxo pipefail

# 1. Sistema actualizado.
dnf update -y

# 2. Instala Docker y Git (ambos vienen en repos de Amazon Linux 2023).
dnf install -y docker git

# 3. Activa Docker como servicio del sistema (arranca automáticamente
#    después de un reboot).
systemctl enable --now docker

# 4. Clona el repo de la app.
#    --depth 1: solo el último commit (más rápido y menos disco).
git clone --depth 1 --branch "${github_branch}" "${github_repo}" /opt/app

# 5. Entra al directorio del Dockerfile.
cd "/opt/app/${app_dir}"

# 6. El Dockerfile espera ./contenidos como subdirectorio del build context.
#    En el repo, contenidos/ está al lado de app/ (no dentro), así que lo
#    copiamos antes del build. `cp -r` sobreescribe sin preguntar.
if [ -d "../contenidos" ] && [ ! -d "./contenidos" ]; then
  cp -r ../contenidos ./contenidos
fi

# 7. Construye la imagen. El build puede tardar 1-3 min en t3.micro.
docker build -t "${project_name}" .

# 8. Lanza el contenedor:
#    -d: en background
#    --restart unless-stopped: arranca automáticamente al reiniciar la VM
#    --name: identificador legible para `docker ps`
#    -p host:container: mapea puerto público al puerto del contenedor
docker run -d \
  --restart unless-stopped \
  --name "${project_name}" \
  -p "${host_port}:${container_port}" \
  "${project_name}"
