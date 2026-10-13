import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    "https://lnctolzzigpsjsvhtxwe.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const RATE_LIMIT_WINDOW_MS =
    5 * 60 * 1000;

const RATE_LIMIT_MAX_REQUESTS =
    3;

const CONTACT_MIN_COMPLETION_MS =
    3000;

const buckets =
    new Map();

function getIp(request) {
    const forwardedFor =
        request.headers["x-forwarded-for"];

    if (typeof forwardedFor === "string" && forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    return request.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
    const now =
        Date.now();

    const bucket =
        buckets.get(ip) || [];

    const recent =
        bucket.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
        buckets.set(ip, recent);

        return true;
    }

    recent.push(now);

    buckets.set(ip, recent);

    return false;
}

function clean(value) {
    return String(value || "").trim();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePayload(payload) {
    const fullName =
        clean(payload.full_name);

    const email =
        clean(payload.email);

    const subject =
        clean(payload.subject);

    const message =
        clean(payload.message);

    if (clean(payload.company)) {
        return {
            ok: false,
            message: "Unable to send this message."
        };
    }

    const startedAt =
        Number(payload.contact_started_at || 0);

    if (!startedAt || Date.now() - startedAt < CONTACT_MIN_COMPLETION_MS) {
        return {
            ok: false,
            message: "Please wait a moment before sending your message."
        };
    }

    if (
        fullName.length < 2 ||
        fullName.length > 120 ||
        !isValidEmail(email) ||
        subject.length < 2 ||
        subject.length > 160 ||
        message.length < 10 ||
        message.length > 4000
    ) {
        return {
            ok: false,
            message: "Please complete the form with valid details."
        };
    }

    return {
        ok: true,
        data: {
            full_name: fullName,
            email,
            subject,
            message
        }
    };
}

export default async function handler(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");

        return response
            .status(405)
            .json({ error: "Method not allowed." });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return response
            .status(500)
            .json({ error: "Contact form is not configured." });
    }

    const ip =
        getIp(request);

    if (isRateLimited(ip)) {
        return response
            .status(429)
            .json({ error: "Too many messages. Please try again later." });
    }

    const result =
        validatePayload(request.body || {});

    if (!result.ok) {
        return response
            .status(400)
            .json({ error: result.message });
    }

    const supabase =
        createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

    const { error } =
        await supabase
            .from("contact_messages")
            .insert([result.data]);

    if (error) {
        console.error("Contact message insert failed:", error);

        return response
            .status(500)
            .json({ error: "Unable to send this message right now." });
    }

    return response
        .status(200)
        .json({ success: true });
}
