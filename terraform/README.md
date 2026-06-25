# Pattern Studio — Infrastructure (Terraform)

Infrastructure-as-code for Pattern Studio's backend: the DynamoDB table that
stores every user's scenes and render history. This is the same table the app
creates via `npm run setup:db`, expressed declaratively so it's reproducible and
reviewable.

| File | What it defines |
|------|-----------------|
| `versions.tf`  | Terraform + AWS provider version pins, provider region |
| `variables.tf` | `aws_region`, `table_name`, `point_in_time_recovery`, `tags` |
| `main.tf`      | The `aws_dynamodb_table` (PK/SK + sparse GSI1, on-demand) |
| `outputs.tf`   | Table name, ARN, GSI name |

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5
- AWS credentials in your environment (same ones as `.env`):
  ```bash
  export AWS_ACCESS_KEY_ID=...
  export AWS_SECRET_ACCESS_KEY=...
  export AWS_REGION=us-east-1
  ```
  (On Windows PowerShell: `$env:AWS_ACCESS_KEY_ID = "..."` etc.)

## The table already exists — import it first

`npm run setup:db` already created `pattern-studio-scenes`. Don't let Terraform
try to create it again (that errors with `ResourceInUseException`). Instead,
**import** the live table into Terraform state so Terraform adopts and manages it:

```bash
cd terraform
terraform init
terraform import aws_dynamodb_table.pattern_studio pattern-studio-scenes
terraform plan
```

The plan should report **no schema changes** (only the `tags` additions, since
the live table has none — that's expected and safe). Apply to attach the tags:

```bash
terraform apply
```

From here, the table is managed as code: change a `.tf` file, `terraform plan`,
`terraform apply`.

## Starting fresh instead

If you ever want Terraform to create the table from scratch (e.g. a clean AWS
account), skip `setup:db` and the import — just:

```bash
cd terraform
terraform init
terraform apply
```

## Hardening for "well-architected" points

Flip on continuous backups (35-day point-in-time restore — the Reliability
pillar) without touching code:

```bash
terraform apply -var="point_in_time_recovery=true"
```

## Notes

- **State is not committed.** `terraform.tfstate` can contain sensitive values
  and is git-ignored. For a team, use a remote backend (e.g. an S3 bucket +
  DynamoDB lock table); for this project local state is fine.
- **`prevent_destroy` is on** for the table (it holds user data). Remove the
  `lifecycle` block in `main.tf` if you intend to tear the environment down.
- Keep `main.tf` in sync with `app/lib/db.ts` — the key schema (PK/SK + GSI1)
  must match what the application queries.
