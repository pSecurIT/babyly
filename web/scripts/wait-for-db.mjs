// Polls DATABASE_URL until Postgres accepts connections; used before `prisma db push` in predev.
import "dotenv/config";
import { Client } from "pg";

const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 1000;

async function wait() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.end();
      console.log("Database is ready.");
      return;
    } catch {
      await client.end().catch(() => {});
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Database not reachable after ${MAX_ATTEMPTS} attempts.`);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

await wait();
