// server/src/utils/storage.js
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL =
  process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim();
const SUPABASE_KEY =
  (process.env.SUPABASE_SERVICE_ROLE && process.env.SUPABASE_SERVICE_ROLE.trim()) ||
  (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim());

// If env is missing in some environments, we can no-op uploads instead of crashing:
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
} else {
  console.warn(
    "[storage] SUPABASE_URL or key not set; uploadPoster() will return empty string."
  );
}

/**
 * Upload a poster image buffer to Supabase Storage 'posters' bucket.
 * Returns a public URL string (if bucket is public); otherwise an empty string.
 *
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} mimeType
 * @returns {Promise<string>} public URL or ""
 */
export async function uploadPoster(buffer, originalName, mimeType) {
  if (!supabase) {
    // no storage configured — don't error the whole request
    return "";
  }

  const ext = (originalName?.split(".").pop() || "bin").toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  // Upload
  const { error: upErr } = await supabase.storage
    .from("posters")
    .upload(filename, buffer, {
      contentType: mimeType || "application/octet-stream",
      upsert: false,
    });

  if (upErr) {
    console.error("[storage] upload error:", upErr);
    return "";
  }

  // Get public URL (works if bucket is public)
  const { data } = supabase.storage.from("posters").getPublicUrl(filename);
  return data?.publicUrl || "";
}