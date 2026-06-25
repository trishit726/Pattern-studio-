import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { sql } from "@vercel/postgres";

// Instantiate DynamoDB Document Client
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

let client: DynamoDBClient;

if (accessKeyId && secretAccessKey) {
  client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
} else {
  // In production Vercel integration, AWS SDK will automatically read from
  // standard process.env.AWS_ACCESS_KEY_ID etc.
  client = new DynamoDBClient({ region });
}

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.AWS_DYNAMODB_TABLE_NAME || "pattern-studio-scenes";

// Function to log render event in Postgres
export async function logRenderEvent(userId: string, composition: string, durationSec: number, status: string) {
  try {
    // Ensure the logs table exists in Vercel Postgres
    await sql`
      CREATE TABLE IF NOT EXISTS render_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        composition VARCHAR(100) NOT NULL,
        duration_sec INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Insert log entry
    await sql`
      INSERT INTO render_logs (user_id, composition, duration_sec, status)
      VALUES (${userId}, ${composition}, ${durationSec}, ${status});
    `;
    console.log("Logged render event successfully in Vercel Postgres.");
  } catch (error) {
    console.error("Failed to log render event to Vercel Postgres:", error);
  }
}
