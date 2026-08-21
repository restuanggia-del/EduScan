import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { checkWablasConnection } from "../../lib/waGateway";
import { toast } from "sonner";
import { cn } from "./ui/utils";

const CHECK_INTERVAL_MS = 2 * 60 * 1000;

export function WhatsAppStatusBadge() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const wasConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let cancelled = false;

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("whatsapp_enabled, whatsapp_token")
          .eq("id", 1)
          .single();

        if (cancelled) return;

        if (error) {
          console.error(
            "[WhatsAppStatusBadge] Gagal ambil data settings:",
            error.message,
          );
          setEnabled(false);
          return;
        }

        if (!data?.whatsapp_enabled || !data?.whatsapp_token) {
          setEnabled(false);
          return;
        }
        setEnabled(true);

        const result = await checkWablasConnection(data.whatsapp_token);
        if (cancelled) return;
        setConnected(result.connected);

        if (result.error) {
          console.error(
            "[WhatsAppStatusBadge] Gagal cek koneksi Wablas:",
            result.error,
          );
        }

        if (wasConnectedRef.current === true && result.connected === false) {
          toast.error(
            "WhatsApp Gateway terputus! Notifikasi ke orang tua tidak akan terkirim sampai device di-scan ulang.",
            { duration: 10000 },
          );
        }
        wasConnectedRef.current = result.connected;
      } catch (err) {
        console.error("[WhatsAppStatusBadge] Error tak terduga:", err);
        setEnabled(false);
      }
    };

    check();
    intervalId = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  if (!enabled || connected === null) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        connected
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700 animate-pulse",
      )}
      title={
        connected
          ? "WhatsApp Gateway terhubung"
          : "WhatsApp Gateway terputus — notifikasi WA tidak akan terkirim! Scan ulang QR di dashboard Wablas."
      }
    >
      {connected ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">
        {connected ? "WA Terhubung" : "WA Terputus"}
      </span>
    </div>
  );
}
