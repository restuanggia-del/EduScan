
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WABLAS_BASE_URL = "https://solo.wablas.com";

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { token } = await req.json();

        if (!token) {
            return new Response(
                JSON.stringify({ status: false, message: "token wajib diisi" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                },
            );
        }

        const wablasResponse = await fetch(
            `${WABLAS_BASE_URL}/api/device/info?token=${encodeURIComponent(token)}`,
            { method: "GET" },
        );

        const result = await wablasResponse.json().catch(() => null);

        const connected =
            result?.data?.status === "connected" ||
            result?.data?.whatsapp?.status === "connected";

        return new Response(
            JSON.stringify({
                status: true,
                connected,
                raw: result,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ status: false, connected: false, message: String(err) }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
