# Nara Educational Society (NES) — complete multipage website

A mobile-friendly, accessible, lightweight organization website with a separate administration portal and optional production Supabase backend.

## Included pages

| Path | Page |
|---|---|
| `index.html` | Home |
| `about.html` | About, mission, vision, values |
| `programs.html` | Eight educational program areas, Nara Talent Hunt |
| `events.html` | Searchable live events |
| `ambassadors.html` | Ambassador program and approved university representatives |
| `join.html` | Membership/volunteer, ambassador and event registration forms |
| `opportunities.html` | Scholarships, internships, jobs and training listings |
| `team.html` | Team directory and organizational structure |
| `media.html` | News, announcements and photo gallery |
| `contact.html` | Contact/partnership inquiry form |
| `verify.html` | Secure certificate verification by unique code |
| `privacy.html` | Privacy and participation notice (draft for NES leadership review) |
| `admin/index.html` | Administrator dashboard |

All pages have proper internal links, meta descriptions, mobile navigation and keyboard-accessible controls. Images and branding SVGs are local files and do not depend on third-party photos. Google Fonts are optional; the website has system font fallbacks.

## Quick start: preview

1. Extract the ZIP.
2. Start a local web server from the folder:
   `python -m http.server 8000`
3. Open `http://localhost:8000/index.html`.
4. Open `http://localhost:8000/admin/index.html` for the management dashboard.
5. Before a backend is configured, click **Open Local Design Preview**. You can create programs, events and other content and see those changes in your browser on the public pages. **Local preview content is stored only in this browser's localStorage — not secure, multiuser, or durable online storage.** It can be lost if the browser data is cleared. Local preview does not accept real applications or validate certificates.

## Go live: permanent data with Supabase

The static public site can run on GitHub Pages, but public applications and an admin dashboard require an actual online backend. Supabase provides PostgreSQL, authentication, image storage, REST endpoints, and server-enforced row-level security.

1. Create a new Supabase project at `https://supabase.com/`.
2. In Supabase **SQL Editor**, execute **`supabase/schema.sql`** once on the new project. This creates tables, public publishing rules, restricted application records, admin access rules, image storage bucket and secure verification function, and seeds the eight NES programs.
3. In **Authentication → Users**, create the administrator user with a strong, unique password and copy its user UUID.
4. In **SQL Editor**, run this with the actual UUID (replace the placeholder):

   ```sql
   insert into public.admins(user_id, role)
   values ('YOUR-AUTH-USER-UUID-HERE', 'super_admin');
   ```

5. In the Supabase project dashboard, open the **Connect** dialog for the **Project URL**, then **Settings → API Keys** for the **publishable (`sb_publishable_...`) key** (or legacy public anon key). These are intentionally safe to put in the public browser when the supplied RLS policies are installed. **Never use a service_role / secret key in browser JavaScript.**
6. Edit `assets/js/config.js`:

   ```js
   window.NES_CONFIG = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseAnonKey: 'YOUR-PUBLIC-ANON-KEY'
   };
   ```

7. In **Authentication → URL Configuration**, configure the live Site URL. Disable unnecessary self-service account signup so users cannot create admin accounts (admin authorization is separately restricted by the `admins` table).
8. Upload this site to your hosting provider (see below). Log into the administrative page with the user created in step 3, then create/publish news, events, ambassador profiles and other records.
9. Update **Website Settings** with NES-approved email, WhatsApp, social links, organizational location, mission and vision. Review the draft privacy page and replace it with your approved policy before taking real applications.
10. Submit a test membership form from a public/private browser window, verify that it appears in Admin → Applications, and confirm that an anonymous browser **cannot** read other applicants or unpublished records.

**Security:** The demo preview is not administrator authentication. The production portal uses Supabase authentication and checks admin authorization server-side via PostgreSQL row-level security. Public visitors can insert applications (after consent), but not list others' applications or browse certificates. Approved team and ambassador information is published only when status is `published`.

**Spam and operational protection:** Public forms have required fields, a honeypot, and database checks. Before broad publicity, add edge/server-side rate limiting and CAPTCHA or Turnstile; client-side checks alone do not prevent bot submissions. Consider notifications, retention policies, backups, and audit logging for larger operations.

### Certificate verification

Admin → Certificates → Issue Certificate generates a cryptographically random verification code. The admin can create a printable certificate with that code using NES's document template. Users enter the code on `verify.html`, or open `verify.html?code=NES-...` from a QR code. The verification RPC returns only recipient, type, issue date and program for **valid** records. Revoked records do not verify. The QR code itself is not an authority; the database lookup is. (QR image generation/printing is not included in this version.)

### Image uploads

In production, the team/media/ambassador/news editors accept an image URL or file upload (PNG, JPEG, WebP and GIF up to 4MB) to the `nes-media` Supabase Storage bucket. Only authorized admins may upload; published image URLs can be viewed by visitors.

### Publish on GitHub Pages

1. Create a repository (for example `nes-website`) or use a domain-named repository.
2. Upload the **contents of this extracted folder** to the repository root: `index.html`, other pages, `assets/`, `admin/`, etc. Do **not** upload just the ZIP as the website.
3. In GitHub, go to **Settings → Pages**, set source to **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. The site will be accessible at the GitHub Pages URL shown by GitHub. If using a custom domain, configure it in Pages settings and DNS as instructed by GitHub. Do not invent a domain name in code until one is registered.
5. For search-engine indexing, run `python generate_sitemap.py https://YOUR-REAL-SITE-DOMAIN` and upload the generated `sitemap.xml`. Add your property to Google Search Console and submit that sitemap.

GitHub Pages **does not** execute Python, PHP or an SQL database itself; the Supabase backend is what makes registrations and edits permanent across users/devices.

## Customize the design

- Colors, spacing, typography, responsiveness: `assets/css/styles.css`
- NES logo: `assets/img/nes-mark.svg`
- Hero illustration: `assets/img/hero-education.svg`
- Public behavior: `assets/js/site.js`
- Dashboard: `admin/index.html`, `assets/js/admin.js` and `assets/css/admin.css`
- Editable mission, vision and contacts: Admin → Site Settings
- Static content: the relevant `.html` file (can be updated by an editor/developer). Programs, events, news, gallery, opportunities and approved directories use the dashboard.

## Reality and content review

This website does not invent events, appointments, partners, achievements, contact details, registrations, or award claims. Those areas show helpful empty states until NES administrators publish verified information. Program areas and governance descriptions are proposals based on the supplied organizational plan; leadership should approve them before the site goes live.

## Limits of this starter

- Not hosted or deployed automatically.
- No live database until Supabase setup is completed.
- No payment/donation processing, attendance check-in, certificate PDF or QR-image generator, SMS/WhatsApp notifications, or automatic email confirmations.
- All initial news, event, team, and ambassador records are intentionally empty; add real ones in Admin.
- The preview-mode browser data is not a safe place for real applicant information.
