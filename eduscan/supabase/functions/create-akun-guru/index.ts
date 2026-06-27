// supabase/functions/create-akun-guru/index.ts
//
// Edge Function ini dipanggil dari frontend saat menambah data Guru.
// - Kalau role_guru = "biasa"      -> cuma insert ke tabel `guru`, tanpa akun login.
// - Kalau role_guru = "wali_kelas" -> generate email otomatis, buat akun di Supabase Auth,
//                                     insert ke `users`, insert ke `guru` (dengan user_id),
//                                     dan update `kelas.wali_kelas_guru_id`.
//
// PENTING: function ini jalan di server (pakai Service Role Key), JANGAN pernah
// taruh Service Role Key di kode frontend.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
        const body = await req.json();
        const {
            nama,
            nip,
            mata_pelajaran,
            role_guru,
            kelas_id,
            no_wa,
            foto_url,
        } = body;

        if (!nama || !role_guru) {
            return new Response(
                JSON.stringify({ error: "Nama dan role_guru wajib diisi" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        if (role_guru === "wali_kelas" && !kelas_id) {
            return new Response(
                JSON.stringify({ error: "kelas_id wajib diisi untuk Guru Wali Kelas" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        if (role_guru === "biasa") {
            const { data: guruData, error: guruError } = await supabaseAdmin
                .from("guru")
                .insert({
                    nama,
                    nip,
                    mata_pelajaran,
                    role_guru: "biasa",
                    no_wa,
                    foto_url,
                })
                .select()
                .single();

            if (guruError) throw guruError;

            return new Response(JSON.stringify({ success: true, guru: guruData }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!nip) {
            return new Response(
                JSON.stringify({ error: "NIP wajib diisi (dipakai sebagai password default)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const { data: emailData, error: emailError } = await supabaseAdmin.rpc(
            "generate_guru_email",
            { p_nama: nama },
        );
        if (emailError) {
            throw new Error("STEP generate_email: " + JSON.stringify(emailError));
        }
        const email = emailData as string;

        const defaultPassword = nip;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: { nama, role: "guru_wali_kelas", must_change_password: true },
        });
        if (authError) {
            throw new Error("STEP create_auth_user: " + JSON.stringify(authError));
        }
        if (!authData?.user) {
            throw new Error("STEP create_auth_user: authData.user kosong, tidak ada error tapi user tidak terbuat");
        }

        const userId = authData.user.id;

        const { data: guruData, error: guruError } = await supabaseAdmin
            .from("guru")
            .insert({
                nama,
                nip,
                mata_pelajaran,
                role_guru: "wali_kelas",
                kelas_id,
                user_id: userId,
                no_wa,
                foto_url,
            })
            .select()
            .single();
        if (guruError) {
            throw new Error("STEP insert_guru: " + JSON.stringify(guruError));
        }

        const { error: kelasError } = await supabaseAdmin
            .from("kelas")
            .update({ wali_kelas_guru_id: guruData.id })
            .eq("id", kelas_id);
        if (kelasError) {
            throw new Error("STEP update_kelas: " + JSON.stringify(kelasError));
        }

        return new Response(
            JSON.stringify({
                success: true,
                guru: guruData,
                akun: { email, password_default: defaultPassword },
            }),
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
