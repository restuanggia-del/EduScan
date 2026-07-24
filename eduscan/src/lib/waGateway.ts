/**
 * Wrapper terpusat untuk mengirim notifikasi WhatsApp lewat Wablas
 * (menggantikan Fonnte).
 *
 * PENTING soal token:
 * Wablas butuh dua nilai: Token & Secret Key (keduanya ada di dashboard
 * Wablas > Device > Settings). Header Authorization-nya harus digabung
 * jadi satu string: "TOKEN.SECRETKEY".
 * Jadi di Pengaturan > WhatsApp API Token, isi dengan format:
 *   TOKEN.SECRETKEY
 * (token dan secret key digabung pakai titik, tanpa spasi)
 *
 * Kalau suatu saat pindah server Wablas (misal dari "solo" ke server
 * lain) atau ganti provider lagi, cukup ubah WABLAS_BASE_URL di bawah
 * ini — semua tempat yang kirim WA otomatis ikut berubah.
 */

const WABLAS_BASE_URL = "https://solo.wablas.com";

export interface SendWaResult {
    success: boolean;
    message: string;
}

/**
 * Kirim satu pesan WhatsApp teks lewat Wablas.
 * @param token   Isi kolom whatsapp_token di settings, format "TOKEN.SECRETKEY"
 * @param phone   Nomor tujuan (boleh diawali 62 atau 0, Wablas terima keduanya)
 * @param message Isi pesan
 */
export async function sendWhatsAppMessage(
    token: string,
    phone: string,
    message: string,
): Promise<SendWaResult> {
    if (!token) {
        return { success: false, message: "Token Wablas belum diisi" };
    }

    try {
        const response = await fetch(`${WABLAS_BASE_URL}/api/send-message`, {
            method: "POST",
            headers: {
                Authorization: token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ phone, message }).toString(),
        });

        const result = await response.json().catch(() => null);

        if (result?.status) {
            return { success: true, message: result.message || "Terkirim" };
        }
        return {
            success: false,
            message: result?.message || "Gagal mengirim pesan WhatsApp",
        };
    } catch (err) {
        console.error("Gagal menghubungi Wablas API:", err);
        return { success: false, message: "Gagal menghubungi Wablas API" };
    }
}
