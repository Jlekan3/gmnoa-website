# GMNOA Website

Public website and administration dashboard for the **Ghana Merchant Navy Officers' Association (GMNOA)**. The site presents the association's leadership, news, events, partners, membership and mentorship links, and contact form. Authorized staff manage content through a Supabase-backed dashboard.

## Tech stack

| Layer | Technology | Use in this project |
| --- | --- | --- |
| Markup | HTML5 | Seven standalone pages built as a multi-page website |
| Styling | CSS3 | Custom responsive styles, primarily inline in page files, plus a separate dashboard stylesheet |
| Frontend logic | Vanilla JavaScript, ES modules | DOM interactions, forms, content loading, authentication, and dashboard operations |
| Development and build | Vite `^5.4.21` | Development server, multi-page production build, and local preview |
| Build internals | Rollup and esbuild through Vite | Bundling and JavaScript transformation; configured target is ES2020 |
| Runtime and packages | Node.js and npm | Build tooling, dependency management, and the server-side contact handler |
| Backend platform | Supabase | Hosted database, authentication, and image storage |
| Database | PostgreSQL through the Supabase data API | Website content, profiles, submissions, settings, and audit logs |
| Supabase SDK | `@supabase/supabase-js` `^2.109.0` | npm dependency for the contact API; browser clients load Supabase JS v2 from jsDelivr |
| Authentication | Supabase Auth | Email/password login, sessions, sign-out, and authentication state changes |
| Authorization | PostgreSQL Row Level Security (RLS) | Public content access and dashboard access for `super_admin`, `admin`, and `editor` roles |
| Image storage | Supabase Storage | `gmnoa-images` bucket with `blogs`, `events`, `leaders`, and `partners` folders |
| Hosting configuration | Vercel | Static build hosting, a Node.js serverless contact endpoint, and HTTP security headers |
| Icons | Lucide via unpkg | Dashboard icons, loaded using `lucide@latest` |
| Typography | Google Fonts | DM Sans and Manrope, plus DM Mono in the dashboard |
| External forms | Google Forms | Membership and mentorship application links |
| Static assets and SEO | Local images, SVG, `robots.txt`, and `sitemap.xml` | Branding, imagery, crawler directives, and page discovery |
| Version control | Git | Source history; dependencies, generated builds, and local secrets are ignored |

Dependency ranges above come from `package.json`. The lockfile currently resolves Vite to `5.4.21` and Supabase JS to `2.109.0`. Browser CDN imports are versioned separately and are not pinned by the npm lockfile.

## How it works

Public pages query Supabase directly with a browser publishable key. RLS policies determine which records visitors can read or submit. The dashboard authenticates users with Supabase Auth and checks the matching `profiles` record for an allowed dashboard role. Database policies enforce access independently of the interface.

The homepage contact form first posts to `/api/contact-message`. That handler validates input and writes to `contact_messages` using a server-only service role key. It includes a honeypot, a minimum form completion time, and an in-memory IP rate limit of three requests per five minutes. This rate limit belongs to each running function instance, rather than a shared persistent store.

If the API is unavailable, returns HTTP 404, 405, or 500, or encounters a network failure, the frontend falls back to a direct Supabase insert governed by the contact table's RLS policy. The API's rate limit therefore does not cover every submission path.

## Project structure

```text
gmnoa-website/
|-- index.html                       # Homepage and public contact form
|-- leadership.html                  # Leadership directory
|-- events.html                      # Events listing
|-- blog.html                        # Blog listing and post view
|-- partners.html                    # Partners directory
|-- admin-login.html                 # Staff sign-in
|-- admin-dashboard.html             # Content administration
|-- api/
|   `-- contact-message.js           # Vercel serverless contact endpoint
|-- src/js/
|   |-- supabase-client.js           # Shared browser client and public config
|   |-- auth.js                      # Authentication helpers
|   |-- admin-dashboard.js           # Dashboard logic and image uploads
|   |-- partners.js                  # Partners directory logic
|   |-- no-download.js               # Browser image interaction restrictions
|   `-- css/admin-dashboard.css      # Dashboard styles
|-- public/
|   |-- assets/images/               # Static imagery and branding
|   |-- favicon.svg
|   |-- robots.txt
|   `-- sitemap.xml
|-- supabase-rls-policies.sql         # Main database and storage access policies
|-- partners-schema-and-rls.sql       # Partners table and focused access policies
|-- vite.config.js                   # Page entries, ports, and build settings
|-- vercel.json                      # HTTP security headers
|-- package.json
`-- package-lock.json
```

## Local development

Use **Node.js 20 or later** and npm. The locked Supabase SDK requires Node.js `>=20.0.0`.

```sh
npm ci
npm run dev
```

Vite serves the site at `http://localhost:5173` and is configured to open the browser automatically. Visit `/admin-login.html` to sign in to the dashboard.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend development server on port 5173 |
| `npm run build` | Build all seven HTML entry points into `dist/` |
| `npm run preview` | Serve the production frontend locally on port 4173 |

Vite's development and preview servers do not execute the Vercel function in `api/`. Contact submissions can use the direct Supabase fallback locally when the database and policies permit it. Testing the server-side handler requires a Vercel-compatible runtime and its environment variables.

## Supabase configuration

The browser URL and publishable key are currently written directly into multiple HTML and JavaScript files. They are not read from `VITE_*` environment variables. When connecting another Supabase project, update all browser client initializations, the server's fallback URL, and the Supabase origins in `vercel.json`.

The application references these tables:

| Table | Purpose |
| --- | --- |
| `profiles` | User profiles and dashboard roles |
| `team_members` | Leadership content |
| `blog_posts` | Blog posts and publication status |
| `events` | Event content and visibility |
| `membership_applications` | Membership submissions managed in the dashboard |
| `mentorship_programs` | Mentorship program records |
| `contact_messages` | Public contact submissions |
| `site_settings` | Shared website settings |
| `partners` | Partner names, links, logos, ordering, and visibility |
| `audit_logs` | Administrative activity records |

`supabase-rls-policies.sql` creates `partners` and `audit_logs` if needed and defines grants, the `is_dashboard_user()` helper, and database/storage policies. **It is not a complete database bootstrap:** the remaining tables, required columns and relationships, and the storage bucket must already exist. The repository does not contain a complete initial schema migration.

For an existing schema, review the main SQL file in the Supabase SQL editor before applying it. `partners-schema-and-rls.sql` provides a focused partners setup and also depends on the existing `profiles` table. Create the `gmnoa-images` storage bucket as public, matching the dashboard configuration, and apply the storage access policies.

Dashboard access requires a Supabase Auth user with a matching `profiles.id` and a role of `super_admin`, `admin`, or `editor`.

## Contact API environment variables

Configure these variables in the server runtime or Vercel project settings:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Optional for the existing project; set for another project | Backend project URL; defaults to the project URL currently in the handler |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for the API handler | Server-only key used to insert contact messages |

Example values:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Keep the service role key in the server environment. It bypasses RLS and must never be placed in HTML, browser JavaScript, or a `VITE_*` variable. The browser uses only the publishable key. Local `.env` files are excluded by `.gitignore`.

## Deployment configuration

The repository is structured for Vercel with `npm run build` as the build command, `dist` as the static output directory, and `api/contact-message.js` as the serverless endpoint. Configure the server environment variables before using that endpoint.

`vercel.json` sets Content Security Policy, frame restrictions, MIME sniffing protection, referrer policy, and permissions policy headers. Its allowed origins include the current Supabase project, jsDelivr, unpkg, Google Fonts, Google Forms, and Unsplash images. Update the policy when changing those integrations.

## Verification

No automated test or lint scripts are currently defined. Use `npm run build` to check production compilation, then manually verify public content, dashboard sign-in and role access, content editing, image uploads, and contact submissions against the intended Supabase project. A successful frontend build does not verify the deployed API or database policies.
