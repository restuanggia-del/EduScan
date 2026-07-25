const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const SEND_WHATSAPP_FUNCTION_URL = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-whatsapp`;

export interface SendWaResult {
    success: boolean;
    message: string;
}

export interface SendWaOptions {
    random?: boolean;
}

/**
 * Kirim satu pesan WhatsApp teks lewat Wablas (via proxy Supabase Edge
 * Function, supaya tidak kena CORS).
 * @param token   Isi kolom whatsapp_token di settings, format "TOKEN.SECRETKEY"
 * @param phone   Nomor tujuan (boleh diawali 62 atau 0, Wablas terima keduanya)
 * @param message Isi pesan
 */
export async function sendWhatsAppMessage(
    token: string,
    phone: string,
    message: string,
    options: SendWaOptions = {},
): Promise<SendWaResult> {
    if (!token) {
        return { success: false, message: "Token Wablas belum diisi" };
    }

    try {
        const response = await fetch(SEND_WHATSAPP_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, phone, message, random: options.random }),
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
        console.error("Gagal menghubungi fungsi proxy WhatsApp:", err);
        return {
            success: false,
            message:
                "Gagal menghubungi fungsi proxy WhatsApp (pastikan Edge Function 'send-whatsapp' sudah di-deploy di Supabase)",
        };
    }
}

export interface BulkWaTarget {
    phone: string;
    message: string;
}

export interface BulkWaResult {
    sent: number;
    failed: number;
    failedTargets: string[];
}

export interface BulkWaOptions extends SendWaOptions {
    /** Berapa pesan dikirim bersamaan dalam 1 batch. Default: 2 — samakan
     *  dengan "Limit Message" di dashboard Wablas (Device > Edit >
     *  Performance Settings), karena paket device menentukan batas maksimal
     *  pesan per batch (untuk paket Medium biasanya 1-2). */
    batchSize?: number;
    /** Jeda (ms) antar batch, supaya tidak membanjiri WhatsApp sekaligus.
     *  Default: 15000 (15 detik) — samakan dengan "Delay Sending" di
     *  dashboard Wablas (Device > Edit > Performance Settings). */
    delayBetweenBatchMs?: number;
    /** Callback opsional untuk update progress ke UI, misal untuk toast. */
    onProgress?: (sent: number, total: number) => void;
}

/**
 * Kirim banyak pesan WhatsApp SEKALIGUS dengan aman: dipecah per-batch
 * (default 5 pesan/batch) dengan jeda antar batch, dan opsional menyebar
 * pengiriman ke beberapa device (random) supaya tidak membebani 1 nomor
 * terus-menerus.
 *
 * PENTING: untuk notifikasi massal (ratusan wali murid), JANGAN kirim
 * satu-satu tanpa jeda — itu pola yang paling rawan bikin nomor WhatsApp
 * kena deteksi spam / diblokir. Selalu pakai fungsi ini untuk pengiriman
 * massal, bukan memanggil sendWhatsAppMessage() di dalam loop biasa.
 */
export async function sendWhatsAppBulk(
    token: string,
    targets: BulkWaTarget[],
    options: BulkWaOptions = {},
): Promise<BulkWaResult> {
    const batchSize = options.batchSize ?? 2;
    const delayBetweenBatchMs = options.delayBetweenBatchMs ?? 15000;

    let sent = 0;
    let failed = 0;
    const failedTargets: string[] = [];

    for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize);

        const results = await Promise.all(
            batch.map((t) =>
                sendWhatsAppMessage(token, t.phone, t.message, {
                    random: options.random,
                }),
            ),
        );

        results.forEach((r, idx) => {
            if (r.success) {
                sent++;
            } else {
                failed++;
                failedTargets.push(batch[idx].phone);
            }
        });

        options.onProgress?.(Math.min(i + batchSize, targets.length), targets.length);

        const isLastBatch = i + batchSize >= targets.length;
        if (!isLastBatch) {
            await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchMs));
        }
    }

    return { sent, failed, failedTargets };
}
