// supabase/functions/auth-login/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Env
// Supabase reserves env names starting with SUPABASE_. Provide fallbacks to custom names
const SUPABASE_URL = (typeof Deno !== "undefined" ? (Deno.env.get("SUPABASE_URL") || Deno.env.get("URL")) : undefined) ?? "";
const SUPABASE_SERVICE_ROLE_KEY = (typeof Deno !== "undefined" ? (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE")) : undefined) ?? "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[auth-login] Missing env URL/SERVICE_ROLE_KEY");
}

// Supabase client (service role for server-side queries)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// CORS
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://sipatuju.vercel.app",
  // common dev servers
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5500",
]);

const baseCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  // Allow whitelisted origins and any localhost/127.0.0.1 with any port for development
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(origin);
  const allowOrigin = (ALLOWED_ORIGINS.has(origin) || isLocal) ? origin : "https://sipatuju.vercel.app";
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

    // Query users table: support both password_hash (bcrypt) and legacy password (plaintext)
    const lookup = (body?.username || '').toString().trim().toLowerCase();
    console.log(`[auth-login] Login attempt username='${lookup}'`);
    // Try exact lower-case match first
    let { data: user, error } = await supabase
      .from("public.users")
      .select("id, username, password_hash, password, role")
      .eq("username", lookup)
      .maybeSingle();

    // Fallback: tolerate trailing spaces ('fahra ')
    if (!user) {
      const res2 = await supabase
        .from("public.users")
        .select("id, username, password_hash, password, role")
        .ilike("username", `${lookup}%`)
        .limit(1)
        .maybeSingle();
      user = res2.data ?? null;
      if (!error) error = res2.error as any;
      if (user && typeof user.username === 'string') {
        if (user.username.trim().toLowerCase() !== lookup) {
          // Not an exact match after trimming → ignore
          user = null as any;
        }
      }
    }

    // Absolute REST fallback (mirrors your working curl test)
    if (!user) {
      try {
        const rest = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,username,password_hash,role&username=eq.${encodeURIComponent(lookup)}`,
          { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (rest.ok) {
          const arr = await rest.json() as any[];
          if (Array.isArray(arr) && arr.length > 0) {
            user = { id: arr[0].id, username: arr[0].username, password_hash: arr[0].password_hash, role: arr[0].role } as any;
            console.log(`[auth-login] REST fallback found user '${user.username}'`);
          }
        }
      } catch (_) {}
    }

    if (user) {
      console.log(`[auth-login] Found user id=${user.id}, username='${user.username}', has_hash=${!!user.password_hash}`);
      let ok = false;
      if (user.password_hash) {
        try {
          ok = bcrypt.compareSync(password, user.password_hash);
        } catch (_) {
          ok = false;
        }
      } else if (user.password) {
        // legacy plaintext password support
        ok = String(user.password) === password;
      }

      if (ok) {
        console.log('[auth-login] User password OK');
        return new Response(
          JSON.stringify({ success: true, message: "Login success", id: user.id, role: user.role || "user" }),
          { status: 200, headers: { "Content-Type": "application/json", ...cors } },
        );
      }
      console.log('[auth-login] User password mismatch');
      // Fallthrough to admin check if user password doesn't match
    }

    // Fallback: check admins table (plaintext password as per current schema)
    const { data: adminRow, error: adminErr } = await supabase
      .from("public.admins")
      .select("id, username, password")
      .ilike("username", `${lookup}%`)
      .limit(1)
      .maybeSingle();

    let adminViaRest: any = null;
    if (!adminRow) {
      try {
        const rest = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=id,username,password&username=ilike.${encodeURIComponent(lookup + '%')}`,
          { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
        if (rest.ok) {
          const arr = await rest.json() as any[];
          if (Array.isArray(arr) && arr.length > 0) {
            adminViaRest = arr[0];
            console.log(`[auth-login] REST fallback found admin '${adminViaRest.username}'`);
          }
        }
      } catch (_) {}
    }

    if (adminRow || adminViaRest) {
      const a = adminRow || adminViaRest;
      console.log(`[auth-login] Found admin id=${a.id}, username='${a.username}'`);
      let adminOk = false;
      if (a.password) {
        // Tolerate accidental whitespace differences for legacy plaintext admin passwords
        const dbPass = String(a.password || '').trim();
        const inPass = String(password || '').trim();
        adminOk = dbPass === inPass;
      }
      if (adminOk) {
        console.log('[auth-login] Admin password OK');
      // Success (admin)
      return new Response(
        JSON.stringify({ success: true, message: "Login success", id: a.id, role: "admin" }),
        { status: 200, headers: { "Content-Type": "application/json", ...cors } },
      );
      }
      console.log('[auth-login] Admin password mismatch');
    }

    // Not found in users (with bcrypt) nor admins (plaintext)
    console.log('[auth-login] Invalid credentials for username=' + lookup);
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