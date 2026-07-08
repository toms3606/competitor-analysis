import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to your Vercel project's environment variables.");
}

/** Tagged-template SQL client. Usage: `await sql\`SELECT * FROM comp_audits WHERE id = ${id}\`` */
export const sql = neon(process.env.DATABASE_URL);
