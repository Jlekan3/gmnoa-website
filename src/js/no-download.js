const MEDIA_SELECTOR = "img, video, audio, canvas, svg, picture, source, object, embed, iframe";
const DOWNLOADABLE_EXTENSIONS =
    /\.(?:avif|gif|jpe?g|png|svg|webp|pdf|zip|rar|7z|docx?|xlsx?|pptx?|csv|mp4|mov|m4v|webm|mp3|wav|ogg)(?:[?#].*)?$/i;

function isProtectedLink(element) {
    const link = element.closest?.("a[href]");

    if (!link) {
        return false;
    }

    const href = link.getAttribute("href") || "";

    return link.hasAttribute("download") || DOWNLOADABLE_EXTENSIONS.test(href);
}

function protectMedia(element) {
    element.setAttribute("draggable", "false");

    if (element instanceof HTMLImageElement) {
        element.decoding = element.decoding || "async";
    }

    if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
        element.setAttribute("controlsList", "nodownload");
    }

    if (element instanceof HTMLVideoElement) {
        element.disablePictureInPicture = true;
    }
}

function applyDownloadProtection(root = document) {
    root.querySelectorAll?.(MEDIA_SELECTOR).forEach(protectMedia);

    root.querySelectorAll?.("a[download]").forEach((link) => {
        link.removeAttribute("download");
    });
}

document.addEventListener(
    "contextmenu",
    (event) => {
        event.preventDefault();
    },
    true
);

document.addEventListener(
    "dragstart",
    (event) => {
        if (event.target.closest?.(MEDIA_SELECTOR) || isProtectedLink(event.target)) {
            event.preventDefault();
        }
    },
    true
);

document.addEventListener(
    "click",
    (event) => {
        if (isProtectedLink(event.target)) {
            event.preventDefault();
        }
    },
    true
);

document.addEventListener(
    "keydown",
    (event) => {
        const key = event.key.toLowerCase();

        if ((event.ctrlKey || event.metaKey) && (key === "s" || key === "p")) {
            event.preventDefault();
        }
    },
    true
);

document.addEventListener("DOMContentLoaded", () => {
    applyDownloadProtection();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }

                if (node.matches?.(MEDIA_SELECTOR)) {
                    protectMedia(node);
                }

                applyDownloadProtection(node);
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
});
