import { supabase } from "./supabaseClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const SEND_WHATSAPP_FUNCTION_URL = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-whatsapp`;
const WABLAS_STATUS_FUNCTION_URL = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/wablas-status`;

export interface SendWaResult {
    success: boolean;
    message: string;
}

export interface DeviceStatusResult {
    connected: boolean;
    checkedAt: Date;
    error?: string;
}

export async function checkWablasConnection(
    token: string,
): Promise<DeviceStatusResult> {
    if (!token) {
        return { connected: false, checkedAt: new Date(), error: "Token belum diisi" };
    }

    try {
        const response = await fetch(WABLAS_STATUS_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });
        const result = await response.json().catch(() => null);

        if (!result?.status) {
            return {
                connected: false,
                checkedAt: new Date(),
                error: result?.message || "Gagal cek status",
            };
        }
        return { connected: !!result.connected, checkedAt: new Date() };
    } catch (err) {
        return {
            connected: false,
            checkedAt: new Date(),
            error: "Gagal menghubungi fungsi cek status",
        };
    }
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

    batchSize?: number;

    delayBetweenBatchMs?: number;
    onProgress?: (sent: number, total: number) => void;
}

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

const MAX_PERCOBAAN_RETRY = 5;

export async function logNotifikasiGagal(params: {
    phone: string;
    message: string;
    jenis?: string;
    error?: string;
}) {
    const { error } = await supabase.from("wa_notifikasi_gagal").insert({
        phone: params.phone,
        message: params.message,
        jenis: params.jenis ?? "lainnya",
        error_terakhir: params.error ?? null,
    });
    if (error) {
        console.error("Gagal menyimpan ke antrian retry WA:", error.message);
    }
}

export interface RetryNotifikasiResult {
    totalDicoba: number;
    berhasil: number;
    masihGagal: number;
    gagalPermanen: number;
}

export async function retryNotifikasiGagal(
    token: string,
): Promise<RetryNotifikasiResult> {
    const { data: pendingRows, error } = await supabase
        .from("wa_notifikasi_gagal")
        .select("id, phone, message, percobaan")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(100);

    if (error || !pendingRows || pendingRows.length === 0) {
        return { totalDicoba: 0, berhasil: 0, masihGagal: 0, gagalPermanen: 0 };
    }

    let berhasil = 0;
    let masihGagal = 0;
    let gagalPermanen = 0;

    for (const row of pendingRows) {
        const result = await sendWhatsAppMessage(token, row.phone, row.message, {
            random: true,
        });

        if (result.success) {
            berhasil++;
            await supabase
                .from("wa_notifikasi_gagal")
                .update({ status: "sent", last_attempt_at: new Date().toISOString() })
                .eq("id", row.id);
        } else {
            const percobaanBaru = (row.percobaan ?? 1) + 1;
            const permanen = percobaanBaru > MAX_PERCOBAAN_RETRY;
            if (permanen) gagalPermanen++;
            else masihGagal++;

            await supabase
                .from("wa_notifikasi_gagal")
                .update({
                    percobaan: percobaanBaru,
                    status: permanen ? "gagal_permanen" : "pending",
                    error_terakhir: result.message,
                    last_attempt_at: new Date().toISOString(),
                })
                .eq("id", row.id);
        }

        await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    return {
        totalDicoba: pendingRows.length,
        berhasil,
        masihGagal,
        gagalPermanen,
    };
}

export async function hitungNotifikasiGagalPending(): Promise<number> {
    const { count } = await supabase
        .from("wa_notifikasi_gagal")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
    return count ?? 0;
}
