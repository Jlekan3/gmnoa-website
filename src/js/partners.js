import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

    const SUPABASE_URL =
        "https://lnctolzzigpsjsvhtxwe.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_O_JT8-AD_heentaVPRdXEQ_x9zCoDtt";

    const supabaseClient =
        createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );



const STORAGE_BUCKET = "gmnoa-images";
const FALLBACK_IMAGES = { partner: "" };
const partnersGrid = document.getElementById("partnersGrid");

loadPartners();

async function loadPartners() {
    try {
        // Fetch in batches so the directory also includes records beyond Supabase's default limit.
        const records = [];
        const batchSize = 500;
        for (let offset = 0; ; offset += batchSize) {
            const { data, error } = await supabaseClient
                .from("partners")
                .select("id, name, website_url, logo_url, display_order, is_active")
                .eq("is_active", true)
                .order("display_order", { ascending: true })
                .order("created_at", { ascending: false })
                .order("id", { ascending: true })
                .range(offset, offset + batchSize - 1);
            if (error) throw error;
            records.push(...(data || []));
            if (!data || data.length < batchSize) break;
        }
        if (!records.length) {
            renderMessage("Partner updates coming soon.");
            return;
        }
        const partners = await Promise.all(records.map(resolvePartnerLogo));
        partnersGrid.innerHTML = partners.map(renderPartnerCard).join("");
        partnersGrid.querySelectorAll("img").forEach(img => {
            const showName = () => {
                const name = document.createElement("span");
                name.className = "partner-name-fallback";
                name.textContent = img.alt;
                img.replaceWith(name);
            };
            img.addEventListener("error", showName, { once: true });
            if (img.complete && !img.naturalWidth) showName();
        });
    } catch (error) {
        renderMessage("Partners are temporarily unavailable. Please check back soon.");
        console.error("Unable to load partners:", error);
    } finally {
        partnersGrid.setAttribute("aria-busy", "false");
    }
}

function renderMessage(message) {
    partnersGrid.innerHTML = '<p class="partners-message" role="status">' + escapeHTML(message) + '</p>';
}

function safeHref(value, fallback = "") {
    try {
        const url = new URL(String(value || "").trim());
        return ["https:", "http:"].includes(url.protocol) ? url.href : fallback;
    } catch {
        return fallback;
    }
}

    function renderPartnerCard(partner) {

        const content = `
            ${
                partnerLogoUrl(partner)
                    ? `<img
                        src="${escapeHTML(partnerLogoUrl(partner))}"
                        alt="${escapeHTML(partner.name || "GMNOA partner")}"
                    >`
                    : `<span class="partner-name-fallback">
                        ${escapeHTML(partner.name || "GMNOA Partner")}
                    </span>`
            }
        `;


        if (safeHref(partner.website_url, "")) {

            return `
                <a
                    class="partner-card"
                    href="${escapeHTML(safeHref(partner.website_url, "#partners"))}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${content}
                </a>
            `;

        }


        return `
            <article class="partner-card">
                ${content}
            </article>
        `;

    }


    function partnerLogoUrl(partner) {

        return partner.resolved_partner_logo_url ||
            partner.logo_url ||
            FALLBACK_IMAGES.partner;

    }


    async function resolvePartnerLogo(partner) {

        return {
            ...partner,
            resolved_partner_logo_url:
                await resolveStorageImageUrl(
                    partner.logo_url,
                    FALLBACK_IMAGES.partner
                )
        };

    }



    async function resolveStorageImageUrl(
        url,
        fallbackImage = ""
    ) {

        const storagePath =
            storagePathFromImageUrl(url);


        if (!storagePath) {
            return url || fallbackImage;
        }


        const {
            data,
            error
        } =
            await supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(
                    storagePath,
                    60 * 60
                );


        if (error || !data?.signedUrl) {
            return url || fallbackImage;
        }


        return data.signedUrl;

    }


    function storagePathFromImageUrl(url) {

        if (!url) {
            return "";
        }


        const value =
            String(url).trim();


        if (
            value.startsWith("blogs/") ||
            value.startsWith("site/") ||
            value.startsWith("events/") ||
            value.startsWith("leaders/") ||
            value.startsWith("partners/")
        ) {
            return value;
        }


        try {

            const parsed =
                new URL(value);

            const markers = [
                `/storage/v1/object/public/${STORAGE_BUCKET}/`,
                `/storage/v1/object/sign/${STORAGE_BUCKET}/`,
                `/storage/v1/object/${STORAGE_BUCKET}/`
            ];


            for (const marker of markers) {

                const index =
                    parsed.pathname.indexOf(marker);

                if (index !== -1) {
                    return decodeURIComponent(
                        parsed.pathname.slice(
                            index + marker.length
                        )
                    );
                }

            }

        }

        catch {
            return "";
        }


        return "";

    }



    function escapeHTML(value) {

        return String(value ?? "")
            .replace(
                /[&<>"']/g,
                char =>
                    ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#039;"
                    }[char])
            );

    }


