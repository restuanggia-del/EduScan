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

        const bareToken = token.split(".")[0];

        async function callDeviceInfo(tokenToUse: string) {
            const res = await fetch(
                `${WABLAS_BASE_URL}/api/device/info?token=${encodeURIComponent(tokenToUse)}`,
                { method: "GET" },
            );
            return res.json().catch(() => null);
        }

        let result = await callDeviceInfo(bareToken);
        let usedToken = "bare";

        if (result?.status === false) {
            result = await callDeviceInfo(token);
            usedToken = "full";
        }

        const explicitPaths = [
            result?.data?.status,
            result?.data?.whatsapp?.status,
            result?.data?.device?.status,
            result?.data?.[0]?.status,
            result?.status_device,
            result?.device_status,
        ];

        let connected = explicitPaths.some(
            (v) => v === "connected" || v === true || v === "Connected",
        );

        if (!connected) {
            const flat = JSON.stringify(result).toLowerCase();
            if (flat.includes('"connected"') && !flat.includes('"disconnected"')) {
                connected = true;
            } else if (flat.includes('status":"connected"')) {
                connected = true;
            }
        }

        return new Response(
            JSON.stringify({
                status: true,
                connected,
                usedToken,
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
