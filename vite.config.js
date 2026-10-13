import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    root: ".",

    publicDir: "public",

    server: {
        port: 5173,
        host: true,
        open: true
    },

    preview: {
        port: 4173,
        host: true
    },

    build: {
        outDir: "dist",
        sourcemap: false,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                leadership: resolve(__dirname, "leadership.html"),
                events: resolve(__dirname, "events.html"),
                blog: resolve(__dirname, "blog.html"),
                adminLogin: resolve(__dirname, "admin-login.html"),
                adminDashboard: resolve(__dirname, "admin-dashboard.html")
            }
        }
    },

    esbuild: {
        target: "es2020"
    }
});
