# Outputs: valores que Terraform imprime tras `apply` y se pueden
# consultar luego con `terraform output <nombre>`.

output "app_url" {
  description = "URL pública para abrir la app en el navegador."
  value       = "http://${aws_eip.app.public_ip}"
}

output "public_ip" {
  description = "IP pública estática (Elastic IP) de la instancia."
  value       = aws_eip.app.public_ip
}

output "public_dns" {
  description = "DNS público asignado por AWS al lanzar la instancia."
  value       = aws_instance.app.public_dns
}

output "instance_id" {
  description = "ID de la instancia EC2 (útil para get-console-output, taint, etc.)."
  value       = aws_instance.app.id
}

output "console_logs_command" {
  description = "Comando para inspeccionar los logs del bootstrap (user_data.sh)."
  value       = "aws ec2 get-console-output --instance-id ${aws_instance.app.id} --region ${var.aws_region} --output text"
}

output "update_app_command" {
  description = "Comando para actualizar la app: recrea la instancia con el último commit."
  value       = "terraform apply -replace=aws_instance.app"
}
