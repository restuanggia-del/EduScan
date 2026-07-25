const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WABLAS_BASE_URL = "https://solo.wablas.com";

Deno.serve(async (req: Request) => {
    // Browser selalu kirim preflight OPTIONS dulu sebelum POST asli
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { token, phone, message, random } = await req.json();

        if (!token || !phone || !message) {
            return new Response(
                JSON.stringify({
                    status: false,
                    message: "token, phone, dan message wajib diisi",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                },
            );
        }

        const params = new URLSearchParams({ phone, message });
        if (random) params.set("random", "true");

        const wablasResponse = await fetch(
            `${WABLAS_BASE_URL}/api/send-message`,
            {
                method: "POST",
                headers: {
                    Authorization: token,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            },
        );

        const result = await wablasResponse.json().catch(() => null);

        return new Response(
            JSON.stringify(
                result ?? { status: false, message: "Respon Wablas tidak valid" },
            ),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ status: false, message: String(err) }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
