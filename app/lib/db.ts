import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { sql } from "@vercel/postgres"

/**
 * DynamoDB client configuration.
 *
 * Reads the Vercel-injected AWS credentials from the environment:
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - AWS_REGION
 *
 * When explicit credentials are present we pass them through; otherwise we let
 * the AWS SDK resolve them from the standard provider chain (useful in some
 * Vercel/AWS runtimes where credentials are injected ambiently).
 */
const region = process.env.AWS_REGION || "us-east-1"
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

const client = new DynamoDBClient({
  region,
  ...(accessKeyId && secretAccessKey
    ? { credentials: { accessKeyId, secretAccessKey } }
    : {}),
})

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    // Scene props can contain optional/undefined fields — strip them so the
    // SDK does not throw when serializing the item.
    removeUndefinedValues: true,
  },
})

/** Name of the DynamoDB table that stores saved scenes. */
export const TABLE_NAME =
  process.env.AWS_DYNAMODB_TABLE_NAME || "pattern-studio-scenes"

/**
 * Logs a single render action to Vercel Postgres.
 *
 * Uses `@vercel/postgres`, which reads `POSTGRES_URL` from the environment
 * automatically. Ensures the `render_logs` table exists before inserting.
 */
export async function logRenderEvent(
  userId: string,
  composition: string,
  durationSec: number,
  status: string,
) {
  // Ensure the logs table exists in Vercel Postgres.
  await sql`
    CREATE TABLE IF NOT EXISTS render_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      composition VARCHAR(100) NOT NULL,
      duration_sec INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `

  // Insert the log entry.
  await sql`
    INSERT INTO render_logs (user_id, composition, duration_sec, status)
    VALUES (${userId}, ${composition}, ${durationSec}, ${status});
  `
}
