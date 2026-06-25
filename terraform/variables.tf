variable "aws_region" {
  description = "AWS region the table lives in. Must match AWS_REGION in your .env."
  type        = string
  default     = "us-east-1"
}

variable "table_name" {
  description = "DynamoDB table name. Must match AWS_DYNAMODB_TABLE_NAME in your .env."
  type        = string
  default     = "pattern-studio-scenes"
}

variable "point_in_time_recovery" {
  description = <<-EOT
    Enable continuous backups (35-day restore window). Off by default so a
    `terraform import` of the existing table shows no drift. Flip to true and
    re-apply to harden the table (Well-Architected reliability pillar).
  EOT
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to the table."
  type        = map(string)
  default = {
    Project   = "pattern-studio"
    ManagedBy = "terraform"
  }
}
