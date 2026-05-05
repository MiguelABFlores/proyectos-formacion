# Despliegue en AWS EC2 con Terraform

Infraestructura como código para levantar la app `tabla-periodica-biblia` en una instancia EC2 con Docker, accesible públicamente por HTTP en el puerto 80.

## Qué crea Terraform

- **1 Security Group** — abre solo el puerto 80 (HTTP); SSH cerrado.
- **1 Instancia EC2** (`t3.micro`, Amazon Linux 2023) en la VPC default.
- **1 Elastic IP** asociada a la instancia (IP pública estable).
- **Bootstrap automático** vía `user_data.sh`: instala Docker, clona el repo, construye la imagen y arranca el contenedor.

Total: ~3-4 minutos desde `terraform apply` hasta tener la URL pública lista.

## Prerrequisitos

1. **Cuenta AWS** activa.
2. **AWS CLI** instalado y configurado (`aws configure`):
   - `Access Key ID` y `Secret Access Key` de un usuario IAM con permisos sobre EC2 y VPC.
   - `Default region`: `us-east-1` (o la que prefieras).
   - El usuario IAM necesita al menos las políticas `AmazonEC2FullAccess` y `AmazonVPCReadOnlyAccess`.
3. **Terraform ≥ 1.6** instalado: [terraform.io/downloads](https://developer.hashicorp.com/terraform/downloads) o `brew install terraform`.

Verifica con:

```bash
aws sts get-caller-identity   # confirma que las credenciales funcionan
terraform version             # debe ser ≥ 1.6.0
```

## Despliegue paso a paso

```bash
# 1. Entrar al directorio de la infra
cd infra/aws-terraform

# 2. (Opcional) Personalizar variables — defaults son sensatos
cp terraform.tfvars.example terraform.tfvars
# editar terraform.tfvars si quieres cambiar región, tipo de instancia, etc.

# 3. Inicializar — descarga el provider AWS
terraform init

# 4. Revisar lo que se creará — sin aplicar nada todavía
terraform plan

# 5. Crear la infraestructura — confirmar con "yes"
terraform apply

# 6. Esperar 3-4 min adicionales mientras user_data.sh instala Docker,
#    clona el repo y arranca el contenedor.

# 7. Obtener la URL pública
terraform output app_url
# → "http://3.214.xxx.xxx"
```

Abre la URL en el navegador. Si tarda en cargar, espera un poco más — el bootstrap puede demorar.

## Verificar que el contenedor arrancó

Si ves la URL pero la página no carga, revisa los logs del bootstrap:

```bash
# Ver logs de cloud-init / user_data en la consola serial de la instancia
$(terraform output -raw console_logs_command)
```

Buscas líneas como `docker run -d --restart unless-stopped ...` y al final algo como `▶ Tabla Periódica de la Biblia listo en http://0.0.0.0:3000`.

## Actualizar la app a la última versión del repo

La instancia es **inmutable**: no entramos por SSH a hacer `git pull`. En su lugar, recreamos la instancia, lo cual ejecuta el `user_data.sh` de nuevo y clona el último commit:

```bash
$(terraform output -raw update_app_command)
# equivale a: terraform apply -replace=aws_instance.app
```

La Elastic IP **se conserva** (la asociación se reata a la nueva instancia), así que la URL pública no cambia. Downtime estimado: 3-4 minutos.

## Destruir todo

```bash
terraform destroy
# confirmar con "yes"
```

Libera la Elastic IP, termina la instancia y borra el security group. Tu factura AWS vuelve a cero (excepto el espacio de los snapshots de EBS si los hubieras tomado manualmente, que aquí no hacemos).

## Costos

| Recurso | Free tier (12 meses) | Tras free tier |
|---|---|---|
| EC2 `t3.micro` | 750 h/mes gratis | ~$8/mes (24/7) |
| Elastic IP asociada a instancia activa | Gratis | Gratis |
| Elastic IP no asociada | — | ~$3.6/mes |
| EBS gp3 8GB | 30 GB gratis | ~$0.7/mes |
| Tráfico saliente | 100 GB gratis | $0.09/GB |

**Para una sesión de formación** (1 hora con 30 jugadores): el costo dentro del free tier es **$0**.

## Troubleshooting

**`terraform apply` falla con "InvalidClientTokenId"**
Tu AWS CLI no tiene credenciales válidas. Corre `aws configure` y reintenta.

**La URL no responde después de 5 minutos**
Mira los logs del bootstrap:
```bash
$(terraform output -raw console_logs_command) | tail -100
```
Posibles causas:
- `docker build` falló por algún error en el Dockerfile.
- El contenedor crasheó al arrancar — revisa con `docker ps` y `docker logs` (necesitarías SSH temporal — habilítalo modificando `network.tf`).

**Quiero abrir SSH temporalmente**
En `network.tf` añade:
```hcl
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["TU_IP/32"]
}
```
Y asocia un key pair en `compute.tf`: `key_name = "tu-key-pair"`. Recuerda quitarlo después.

## State remoto (recomendado para equipos)

El `terraform.tfstate` local es práctico para uso individual, pero en equipo migra a S3:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "mi-terraform-state"
    key    = "tabla-periodica-biblia/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-lock"   # locks para evitar applies concurrentes
  }
}
```

Tras crear el bucket y la tabla DynamoDB:
```bash
terraform init -migrate-state
```

## Mejoras futuras (no incluidas)

- **HTTPS**: añadir un Application Load Balancer + ACM cert + Route 53.
- **Auto-scaling**: pasar a Launch Template + ASG si superas las 30 conexiones simultáneas.
- **CloudWatch logs**: enviar logs del contenedor a CloudWatch en vez de quedarse solo en `docker logs`.
- **CI/CD**: GitHub Actions con `aws-actions/configure-aws-credentials` que dispara `terraform apply -replace=aws_instance.app` al hacer merge a `main`.
