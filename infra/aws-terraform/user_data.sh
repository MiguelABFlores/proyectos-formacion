#!/bin/bash
# Script de bootstrap que corre cloud-init en el primer boot de la instancia.
#
# Logs visibles con:
#   aws ec2 get-console-output --instance-id <ID>
# o ya dentro de la instancia (si se habilita SSH temporalmente):
#   sudo cat /var/log/cloud-init-output.log
#
# Las variables $${...} (escritas como $$ doble en este comentario por la
# regla de templatefile de Terraform) las interpola Terraform al renderizar
# el script. NO son variables de bash. Para usar variables de bash dentro
# del script, escapa el dolar como $$VAR.

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

# 5. El Dockerfile usa rutas como `app/package*.json` y `contenidos/`,
#    así que el build context tiene que ser el directorio PADRE de app/
#    (típicamente tabla-periodica-biblia/), no app/ mismo.
#
#    `app_dir` apunta al directorio del Dockerfile (ej: tabla-periodica-biblia/app),
#    así que el contexto es el padre.
APP_PATH="/opt/app/${app_dir}"
BUILD_CONTEXT="$$(dirname "$$APP_PATH")"

cd "$$BUILD_CONTEXT"

# 6. Construye la imagen pasando el Dockerfile explícito con -f.
#    El build puede tardar 1-3 min en t3.micro.
docker build -t "${project_name}" -f "$$APP_PATH/Dockerfile" .

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
