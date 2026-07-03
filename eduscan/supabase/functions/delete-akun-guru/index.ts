// supabase/functions/delete-akun-guru/index.ts
//
// Edge Function ini dipanggil saat KS/TU menghapus data guru.
// - Lepas dulu referensi wali_kelas_guru_id di tabel kelas (kalau ada)
// - Hapus baris di tabel guru
// - Kalau guru ini punya akun login (user_id terisi):
//     - Hapus baris di tabel users
//     - Hapus akun di Supabase Auth (auth.users) lewat Admin API
//
// PENTING: butuh Service Role Key (otomatis tersedia di environment Edge Function),
// JANGAN taruh di kode frontend.

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
                JSON.stringify({ error: "Akses ditolak: hanya Kepala Sekolah/TU yang bisa menghapus guru." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const { guru_id } = await req.json();

        if (!guru_id) {
            return new Response(JSON.stringify({ error: "guru_id wajib diisi" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { data: guruData, error: getGuruError } = await supabaseAdmin
            .from("guru")
            .select("id, user_id")
            .eq("id", guru_id)
            .maybeSingle();

        if (getGuruError) {
            throw new Error("STEP get_guru: " + JSON.stringify(getGuruError));
        }

        if (!guruData) {
            return new Response(
                JSON.stringify({ success: true, akun_dihapus: false, note: "Guru sudah tidak ada di database." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const { error: clearKelasError } = await supabaseAdmin
            .from("kelas")
            .update({ wali_kelas_guru_id: null })
            .eq("wali_kelas_guru_id", guru_id);

        if (clearKelasError) {
            throw new Error("STEP clear_kelas: " + JSON.stringify(clearKelasError));
        }

        const { error: clearAbsensiError } = await supabaseAdmin
            .from("absensi_guru")
            .update({ guru_id: null })
            .eq("guru_id", guru_id);

        if (clearAbsensiError) {
            throw new Error("STEP clear_absensi_guru: " + JSON.stringify(clearAbsensiError));
        }

        const { error: deleteGuruError } = await supabaseAdmin
            .from("guru")
            .delete()
            .eq("id", guru_id);

        if (deleteGuruError) {
            throw new Error("STEP delete_guru: " + JSON.stringify(deleteGuruError));
        }

        if (guruData.user_id) {

            const { error: clearAbsensiUserError } = await supabaseAdmin
                .from("absensi_guru")
                .update({ user_id: null })
                .eq("user_id", guruData.user_id);

            if (clearAbsensiUserError) {
                throw new Error(
                    "STEP clear_absensi_guru_user: " + JSON.stringify(clearAbsensiUserError),
                );
            }

            const { error: deleteUserRowError } = await supabaseAdmin
                .from("users")
                .delete()
                .eq("id", guruData.user_id);

            if (deleteUserRowError) {
                throw new Error("STEP delete_users_row: " + JSON.stringify(deleteUserRowError));
            }

            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
                guruData.user_id,
            );

            if (deleteAuthError) {
                throw new Error("STEP delete_auth_user: " + JSON.stringify(deleteAuthError));
            }
        }

        return new Response(
            JSON.stringify({ success: true, akun_dihapus: !!guruData.user_id }),
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
