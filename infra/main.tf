# ==============================================================================
# AWS Infrastructure Configuration for Pattern Studio (Production Architecture)
# ==============================================================================
# This Terraform blueprint outlines the production-scale architecture for
# Pattern Studio. It sets up DynamoDB Global Tables, S3, CloudFront CDN,
# SQS Queues, and IAM Roles to support a B2C SaaS serving millions of users.

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- Variables ---

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for deployments"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment name (staging/production)"
}

variable "project_name" {
  type        = string
  default     = "pattern-studio"
  description = "Prefix name used for AWS resources"
}

# --- 1. Database Layer: Amazon DynamoDB (Scenes Table) ---

resource "aws_dynamodb_table" "scenes" {
  name             = "${var.project_name}-scenes-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST" # On-demand auto-scaling
  hash_key         = "id"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Primary keys definition
  attribute {
    name = "id"
    type = "S" # Scene ID (UUID)
  }

  # Index keys definition
  attribute {
    name = "userId"
    type = "S" # Owner ID (Clerk User ID)
  }

  attribute {
    name = "updatedAt"
    type = "N" # Epoch millisecond timestamp for sorting
  }

  # Global Secondary Index (GSI) for querying scenes by user sorted by date
  # Essential for fast single-ms reads without doing expensive table scans.
  global_secondary_index {
    name            = "userId-updatedAt-index"
    hash_key        = "userId"
    range_key       = "updatedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- 2. Database Layer: Amazon Aurora Serverless v2 PostgreSQL ---

# RDS VPC & Subnets (Simplified outline)
resource "aws_vpc" "db_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc" }
}

resource "aws_subnet" "db_subnet_1" {
  vpc_id            = aws_vpc.db_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
}

resource "aws_subnet" "db_subnet_2" {
  vpc_id            = aws_vpc.db_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
}

resource "aws_db_subnet_group" "db_subnets" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = [aws_subnet.db_subnet_1.id, aws_subnet.db_subnet_2.id]
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier   = "${var.project_name}-analytics-cluster"
  engine               = "aurora-postgresql"
  engine_mode          = "provisioned"
  engine_version       = "15.4"
  database_name        = "patternstudio"
  master_username      = "postgres"
  master_password      = "SecureDatabasePassword123!" # In real env, inject from Secrets Manager
  db_subnet_group_name = aws_db_subnet_group.db_subnets.name
  skip_final_snapshot  = true

  serverlessv2_scaling_configuration {
    max_capacity = 8.0 # Max ACU (Aurora Capacity Units)
    min_capacity = 0.5 # Min ACU (Scales down during idle hours)
  }
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version
}

# --- 3. Storage Layer: Amazon S3 (Video Assets & Uploads) ---

resource "aws_s3_bucket" "assets" {
  bucket        = "${var.project_name}-assets-${var.environment}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "assets_access" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Lifecycle configuration to delete rendered videos after 7 days (reduces storage costs)
resource "aws_s3_bucket_lifecycle_configuration" "cleanup_renders" {
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "delete-temp-videos"
    status = "Enabled"

    filter {
      prefix = "renders/"
    }

    expiration {
      days = 7
    }
  }
}

# CORS rule for browser-direct file uploads
resource "aws_s3_bucket_cors_configuration" "cors" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["https://*.vercel.app", "http://localhost:*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- 4. CDN Layer: Amazon CloudFront (Global Cache) ---

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for S3 assets"
}

resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN distribution serving Pattern Studio visual assets"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# --- 5. Queue Layer: Amazon SQS (Render Jobs Queue) ---

resource "aws_sqs_queue" "render_queue" {
  name                      = "${var.project_name}-render-queue-${var.environment}"
  delay_seconds             = 0
  max_message_size          = 262144 # 256 KB
  message_retention_seconds = 86400  # 24 Hours
  receive_wait_time_seconds = 20     # Long polling enabled
  visibility_timeout_seconds = 300   # 5-minute timeout for rendering jobs

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3 # Move to DLQ after 3 retries
  })
}

# Dead Letter Queue (DLQ) for failed render jobs
resource "aws_sqs_queue" "dlq" {
  name = "${var.project_name}-render-dlq-${var.environment}"
}

# --- 6. Compute Layer: AWS Lambda (Remotion Worker & DB Stream Processor) ---

# Lambda Role Policy
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Inline policy to read SQS, write to S3 and DynamoDB
resource "aws_iam_role_policy" "lambda_aws_access" {
  name = "${var.project_name}-lambda-access-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.assets.arn,
          "${aws_s3_bucket.assets.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.render_queue.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.scenes.arn
      }
    ]
  })
}

# --- Outputs ---

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.scenes.name
  description = "The DynamoDB table name"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.assets.bucket
  description = "The S3 bucket name"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
  description = "CloudFront CDN domain URL"
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.render_queue.url
  description = "SQS queue URL for video renders"
}
