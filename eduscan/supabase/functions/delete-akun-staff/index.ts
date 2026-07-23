import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization") ?? "";
        const supabaseAsCaller = createClient(SUPABASE_URL, ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: roleData, error: roleError } = await supabaseAsCaller.rpc(
            "current_role",
        );

        if (roleError || !["kepala_sekolah", "tu"].includes(roleData)) {
            return new Response(
                JSON.stringify({ error: "Akses ditolak: hanya Kepala Sekolah/TU yang bisa menghapus akun ini." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const { user_id } = await req.json();

        if (!user_id) {
            return new Response(JSON.stringify({ error: "user_id wajib diisi" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { data: { user: caller } } = await supabaseAsCaller.auth.getUser();
        if (caller?.id === user_id) {
            return new Response(
                JSON.stringify({ error: "Tidak bisa menghapus akun sendiri." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const { data: targetUser, error: getUserError } = await supabaseAdmin
            .from("users")
            .select("id, role")
            .eq("id", user_id)
            .maybeSingle();

        if (getUserError) {
            throw new Error("STEP get_user: " + JSON.stringify(getUserError));
        }

        if (!targetUser) {
            return new Response(
                JSON.stringify({ success: true, akun_dihapus: false, note: "Akun sudah tidak ada di database." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        if (!["tu", "kepala_sekolah"].includes(targetUser.role)) {
            return new Response(
                JSON.stringify({ error: "Function ini hanya untuk menghapus akun TU/Kepala Sekolah." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const { error: clearAbsensiUserError } = await supabaseAdmin
            .from("absensi_guru")
            .update({ user_id: null })
            .eq("user_id", user_id);

        if (clearAbsensiUserError) {
            throw new Error("STEP clear_absensi_guru_user: " + JSON.stringify(clearAbsensiUserError));
        }

        const { error: deleteUserRowError } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("id", user_id);

        if (deleteUserRowError) {
            throw new Error("STEP delete_users_row: " + JSON.stringify(deleteUserRowError));
        }

        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        if (deleteAuthError) {
            throw new Error("STEP delete_auth_user: " + JSON.stringify(deleteAuthError));
        }

        return new Response(
            JSON.stringify({ success: true, akun_dihapus: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
