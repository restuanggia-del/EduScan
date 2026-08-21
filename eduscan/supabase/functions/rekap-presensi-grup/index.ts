import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WABLAS_BASE_URL = "https://solo.wablas.com";

function getWaktuJakarta() {
    const now = new Date();
    const tanggal = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now); // "YYYY-MM-DD"

    const jamMenit = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(now); // "HH:MM"

    return { tanggal, jamMenit };
}

function normalisasiJam(jamStr: string | null): string | null {
    if (!jamStr) return null;
    return jamStr.slice(0, 5);
}

async function kirimKeGrup(token: string, groupId: string, message: string) {
    const response = await fetch(`${WABLAS_BASE_URL}/api/send-message`, {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ phone: groupId, message }).toString(),
    });
    return response.json().catch(() => null);
}

const STATUS_LABEL: Record<string, string> = {
    hadir: "Tepat Waktu",
    terlambat: "Terlambat",
    izin: "Izin",
    sakit: "Sakit",
    alfa: "Alfa (Tanpa Keterangan)",
};

function formatRekap(
    namaSekolah: string,
    namaKelas: string,
    tanggalDisplay: string,
    jenis: "pagi" | "pulang",
    rows: {
        nama: string;
        nisn: string;
        status: string;
        jam_scan: string | null;
        jam_pulang: string | null;
    }[],
) {
    if (jenis === "pagi") {
        const rowsPagi = rows.filter((r) => r.status !== "pulang");

        if (rowsPagi.length === 0) {
            return `Selamat Pagi Bapak/Ibu, belum ada data presensi untuk kelas ${namaKelas} hari ini (${tanggalDisplay}).\n\n${namaSekolah}`;
        }

        const daftar = rowsPagi
            .map((r, i) => {
                const label = STATUS_LABEL[r.status] || r.status;
                const jamSuffix =
                    (r.status === "hadir" || r.status === "terlambat") && r.jam_scan
                        ? ` (${r.jam_scan})`
                        : "";
                return `${i + 1}. ${r.nama} - ${namaKelas} - NISN: ${r.nisn} - ${label}${jamSuffix}`;
            })
            .join("\n");

        return `Selamat Pagi Bapak/Ibu, berikut presensi siswa/siswi ${namaSekolah}:

${daftar}

${namaSekolah}`;
    }

    const pulang = rows.filter((r) => r.jam_pulang);
    if (pulang.length === 0) {
        return `Selamat Sore Bapak/Ibu, belum ada siswa/siswi kelas ${namaKelas} yang tercatat pulang hari ini (${tanggalDisplay}).\n\n${namaSekolah}`;
    }

    const daftarPulang = pulang
        .map(
            (r, i) =>
                `${i + 1}. ${r.nama} - ${namaKelas} - NISN: ${r.nisn} - Pulang pukul ${r.jam_pulang}`,
        )
        .join("\n");

    return `Selamat Sore Bapak/Ibu, berikut informasi siswa/siswi ${namaSekolah} yang sudah pulang:

${daftarPulang}

${namaSekolah}`;
}

async function prosesRekap(jenis: "pagi" | "pulang") {
    const { data: settings } = await supabaseAdmin
        .from("settings")
        .select(
            "whatsapp_enabled, whatsapp_token, nama_sekolah, rekap_pagi_enabled, rekap_pagi_jam, rekap_pagi_last_sent_date, rekap_pulang_enabled, rekap_pulang_jam, rekap_pulang_last_sent_date",
        )
        .eq("id", 1)
        .single();

    if (!settings?.whatsapp_enabled || !settings?.whatsapp_token) {
        return { skipped: "whatsapp belum aktif / token kosong" };
    }

    const enabled =
        jenis === "pagi"
            ? settings.rekap_pagi_enabled
            : settings.rekap_pulang_enabled;
    const jamSetting = normalisasiJam(
        jenis === "pagi" ? settings.rekap_pagi_jam : settings.rekap_pulang_jam,
    );
    const lastSent =
        jenis === "pagi"
            ? settings.rekap_pagi_last_sent_date
            : settings.rekap_pulang_last_sent_date;

    if (!enabled || !jamSetting) {
        return { skipped: `rekap ${jenis} nonaktif` };
    }

    const { tanggal, jamMenit } = getWaktuJakarta();

    if (lastSent === tanggal) {
        return { skipped: `rekap ${jenis} sudah dikirim hari ini` };
    }

    if (jamMenit < jamSetting) {
        return { skipped: `belum jam ${jamSetting} (sekarang ${jamMenit})` };
    }

    const { data: kelasList } = await supabaseAdmin
        .from("kelas")
        .select("id, nama_kelas, whatsapp_group_id")
        .not("whatsapp_group_id", "is", null);

    if (!kelasList || kelasList.length === 0) {
        return { skipped: "belum ada kelas dengan whatsapp_group_id" };
    }

    const tanggalDisplay = new Date().toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const { data: absensiRows } = await supabaseAdmin
        .from("absensi_siswa")
        .select("status, waktu_scan, siswa:siswa_id(nama, nisn, kelas_id)")
        .eq("tanggal", tanggal);

    const namaSekolah = settings.nama_sekolah || "Sekolah";
    const hasil: Record<string, string> = {};

    for (const kelas of kelasList) {
        const rowsKelasIni = (absensiRows || [])
            .filter((r: any) => r.siswa?.kelas_id === kelas.id)
            .map((r: any) => ({
                nama: r.siswa?.nama || "-",
                nisn: r.siswa?.nisn || "-",
                status: r.status,
                jam_scan: new Date(r.waktu_scan).toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                jam_pulang:
                    r.status === "pulang"
                        ? new Date(r.waktu_scan).toLocaleTimeString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : null,
            }))
            .sort((a: any, b: any) => a.nama.localeCompare(b.nama));

        const message = formatRekap(
            namaSekolah,
            kelas.nama_kelas,
            tanggalDisplay,
            jenis,
            rowsKelasIni,
        );

        const result = await kirimKeGrup(
            settings.whatsapp_token,
            kelas.whatsapp_group_id,
            message,
        );
        hasil[kelas.nama_kelas] = result?.status ? "terkirim" : "gagal";

        await new Promise((r) => setTimeout(r, 3000));
    }

    await supabaseAdmin
        .from("settings")
        .update(
            jenis === "pagi"
                ? { rekap_pagi_last_sent_date: tanggal }
                : { rekap_pulang_last_sent_date: tanggal },
        )
        .eq("id", 1);

    return { sent: true, hasil };
}

Deno.serve(async (_req: Request) => {
    try {
        const hasilPagi = await prosesRekap("pagi");
        const hasilPulang = await prosesRekap("pulang");

        return new Response(
            JSON.stringify({ pagi: hasilPagi, pulang: hasilPulang }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (err) {
        console.error("rekap-presensi-grup error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
