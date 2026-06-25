output "table_name" {
  description = "Name of the DynamoDB table (set as AWS_DYNAMODB_TABLE_NAME)."
  value       = aws_dynamodb_table.pattern_studio.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table — use to scope IAM policies."
  value       = aws_dynamodb_table.pattern_studio.arn
}

output "gsi1_name" {
  description = "Name of the sparse recency index used by listScenes()."
  value       = "GSI1"
}
