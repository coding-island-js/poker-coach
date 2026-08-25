import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_POKERCOACH ??
  process.env.NETLIFY_DATABASE_URL;

if (!url) throw new Error("No database URL configured");

export const sql = neon(url);
