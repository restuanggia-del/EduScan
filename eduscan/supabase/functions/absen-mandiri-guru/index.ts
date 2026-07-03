import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

Deno.serve(async (req) => {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { tipe } = await req.json();

    const { data: guru, error: guruErr } = await supabase
        .from("guru")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (guruErr || !guru) return new Response(JSON.stringify({ error: "Data guru tidak ditemukan" }), { status: 404 });

    const now = new Date();
    const hariIni = HARI_MAP[now.getDay()];

    if (hariIni === "minggu" || hariIni === "sabtu") {
        return new Response(JSON.stringify({ error: "Bukan hari sekolah" }), { status: 400 });
    }

    let status: string;

    if (tipe === "masuk") {
        const { data: jadwal } = await supabase
            .from("jadwal_guru")
            .select("jam_masuk")
            .eq("guru_id", guru.id)
            .eq("hari", hariIni)
            .maybeSingle();

        if (!jadwal) {
            return new Response(JSON.stringify({ error: "Tidak ada jadwal mengajar hari ini" }), { status: 400 });
        }

        const jamSekarang = now.toTimeString().slice(0, 8);
        status = jamSekarang <= jadwal.jam_masuk ? "hadir" : "terlambat";
    } else if (tipe === "pulang") {
        status = "pulang";
    } else {
        return new Response(JSON.stringify({ error: "tipe tidak valid" }), { status: 400 });
    }

    const today = now.toISOString().slice(0, 10);
    const { data: existing } = await supabase
        .from("absensi_guru")
        .select("id")
        .eq("guru_id", guru.id)
        .eq("tanggal", today)
        .eq("status", status)
        .maybeSingle();

    if (existing) {
        return new Response(JSON.stringify({ error: `Sudah absen ${tipe} hari ini` }), { status: 409 });
    }

    const { data: inserted, error: insertErr } = await supabase
        .from("absensi_guru")
        .insert({
            guru_id: guru.id,
            user_id: user.id,
            peran: "guru",
            status,
            tanggal: today,
        })
        .select()
        .single();

    if (insertErr) return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });

    return new Response(JSON.stringify({ success: true, status, data: inserted }), { status: 200 });
});
