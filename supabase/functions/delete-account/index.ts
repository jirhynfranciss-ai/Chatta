// Supabase Edge Function: delete-account
// Deploy with: supabase functions deploy delete-account
// Requires the function's environment to have SUPABASE_SERVICE_ROLE_KEY set
// (configured automatically by Supabase for Edge Functions, never exposed to the client).
//
// This function permanently deletes the authenticated user's account and all
// associated data (profile, responses, answers, conversation, messages).

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client scoped to the caller's JWT, used only to identify who is making the request.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    // Admin client used only inside this trusted server environment.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await adminClient.from("messages").delete().eq("sender_id", user.id);
    await adminClient.from("conversations").delete().eq("user_id", user.id);
    await adminClient.from("responses").delete().eq("user_id", user.id);
    await adminClient.from("user_preferences").delete().eq("user_id", user.id);
    await adminClient.from("profiles").delete().eq("id", user.id);

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500 });
  }
});
