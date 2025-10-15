// supabase/functions/auth-login/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Env
const SUPABASE_URL = deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[auth-login] Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Supabase client (service role for server-side queries)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// CORS
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://sipatuju.vercel.app",
]);

const baseCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://sipatuju.vercel.app";
  return { ...baseCorsHeaders, "Access-Control-Allow-Origin": allowOrigin };
}

// ✅ CORS configured successfully
serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
  }

  const cors = buildCorsHeaders(request);

  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, message: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...cors } },
      );
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid content type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } },
      );
    }

    const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
    const username = body?.username?.trim();
    const password = body?.password ?? "";

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, message: "Username and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...cors } },
      );
    }

    // Query users table: select username + password_hash
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, password_hash")
      .eq("username", username)
      .single();

    if (user && user.password_hash && !error) {
      // Verify password using bcrypt (users table)
      const passwordOk = await bcrypt.compare(password, user.password_hash);
      if (!passwordOk) {
        return new Response(
          JSON.stringify({ success: false, message: "Invalid credentials" }),
          { status: 401, headers: { "Content-Type": "application/json", ...cors } },
        );
      }
      // Success (user)
      return new Response(
        JSON.stringify({ success: true, message: "Login success" }),
        { status: 200, headers: { "Content-Type": "application/json", ...cors } },
      );
    }

    // Fallback: check admins table (plaintext password as per current schema)
    const { data: adminRow, error: adminErr } = await supabase
      .from("admins")
      .select("id, username, password")
      .eq("username", username)
      .single();

    if (!adminErr && adminRow && adminRow.password === password) {
      // Success (admin)
      return new Response(
        JSON.stringify({ success: true, message: "Login success" }),
        { status: 200, headers: { "Content-Type": "application/json", ...cors } },
      );
    }

    // Not found in users (with bcrypt) nor admins (plaintext)
    return new Response(
      JSON.stringify({ success: false, message: "Invalid credentials" }),
      { status: 401, headers: { "Content-Type": "application/json", ...cors } },
    );
  } catch (err) {
    console.error("[auth-login] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } },
    );
  }
});