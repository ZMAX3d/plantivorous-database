# Deploying the Plantivorous database on the Joomla site

**Handover guide for the website creator and host.**
Live reference: <https://zmax3d.github.io/plantivorous-database/>
Source: <https://github.com/ZMAX3d/plantivorous-database>
Shareable/printable HTML version: <https://zmax3d.github.io/plantivorous-database/joomla/handover.html>

---

## 1. What is being deployed

The catalogue is a **static single-page app**: plain HTML, CSS, JavaScript and JPEG/SVG images. It does **not** need PHP, MySQL, Node.js, Composer or a Joomla extension at runtime. Joomla keeps running exactly as it does now.

The runtime files are:

```
index.html
assets/
├── css/
├── fonts/
├── img/
└── js/
    ├── app.js
    ├── data.js
    └── world-map.js
```

`data/` is only the source data for maintainers and is **not** loaded by the browser. Do not upload `scripts/`, `node_modules/`, `.github/` or `.photo-test/`.

The app uses hash routes (`#/species/...`), relative asset paths and no server-side routing, so it works from any subfolder or subdomain without `.htaccess` rewrites.

---

## 2. Host requirements

- Any normal web host (Apache, LiteSpeed, Nginx) with HTTPS.
- Write access to a folder such as `public_html/database/`.
- Standard MIME types for `.html`, `.css`, `.js`, `.jpg`, `.svg`, `.woff2`.
- No PHP version requirement, no database, no cron job.
- Optional for automatic updates: an **FTP, FTPS or SFTP** account limited to the database folder.

Disk use is about **105 MB** uncompressed (96 MB of photographs).

---

## 3. Option A — subfolder + Joomla menu link (recommended)

This is the simplest and most reliable setup. Joomla and the catalogue stay independent.

### Host / cPanel

1. Open **cPanel → File Manager → `public_html`**.
2. Create a folder named `database`.
3. Upload `plantivorous-database-static.zip` into it and choose **Extract**.
4. Confirm the structure is `public_html/database/index.html` and `public_html/database/assets/...` — not a nested `plantivorous-database/` folder.
5. Set folders to `755` and files to `644` if the host requires it.

### Joomla administrator

1. **Menus → Main Menu → Add New Menu Item**.
2. Choose **System Links → External URL**.
3. Link: `/database/` (or `https://www.plantivorous.co.za/database/`).
4. Title: `Plant Database`.
5. Optional: **Target Window → New Window**.
6. Save and open the menu item.

Test both:

- `https://www.plantivorous.co.za/database/`
- `https://www.plantivorous.co.za/database/#/species/cephalotus-bananito`

---

## 4. Option B — Joomla Wrapper (inside the Joomla template)

Use this if the database must appear **inside** the Joomla header/footer instead of as a separate page.

1. Add the menu item as above, but choose **System Links → Wrapper**.
2. URL: `https://www.plantivorous.co.za/database/?embed=1`
3. Width: `100%`.
4. Height: `1200` (or the height that suits the template; the app scrolls inside the frame).
5. Enable **Scroll Bars** if Joomla offers the option.

`?embed=1` puts the app in embed mode:

- hides the app's own Plantivorous header and footer, so there is no double header;
- adds a slim dark bar with **← Plantivorous shop** (opens the shop in the parent window) and a “Carnivorous plant database” label;
- keeps all deep links, search, maps, collection and wishlist working.

Caveats: iframes are weaker for SEO and can feel awkward on mobile. For the main navigation, **Option A is better**; use the Wrapper for a secondary “Database” tab or an embedded section.

---

## 5. Option C — Custom HTML module or article

Use `joomla/custom-html-embed.html` as the module content. It contains a responsive iframe pointed at `/database/?embed=1`.

1. **Content → Site Modules → New → Custom**.
2. Paste the snippet from `joomla/custom-html-embed.html`.
3. Assign it to a full-width template position on the page where the database should appear.
4. If the Joomla editor strips `<iframe>`, switch the editor to **No Editor** for that module or paste the snippet in the module's HTML source view.

Recommended iframe styling is already in the snippet: `width:100%`, `height:calc(100vh - 160px)`, `min-height:720px`, no border.

---

## 6. Automatic updates from GitHub (FTP / SFTP)

The repository contains `.github/workflows/deploy-ftp.yml`. It uploads **only** `index.html` and `assets/` to the host.

It runs:

- on every push to `master` that changes `index.html` or `assets/**`;
- after the monthly ICPS check, when new taxa were added;
- manually from **Actions → Deploy static site (FTP/SFTP) → Run workflow**.

If the secrets below are missing, the workflow skips the upload and prints a notice — it does not fail.

### Repository secrets

Add them in GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Example | Notes |
|---|---|---|
| `FTP_SERVER` | `ftp.plantivorous.co.za` | Hostname only, no `ftp://` |
| `FTP_USERNAME` | `database-deploy` | Dedicated account, not the main cPanel login |
| `FTP_PASSWORD` | `••••••••` | Rotate periodically |
| `FTP_PROTOCOL` | `ftps` | `ftps` (recommended), `ftp`, or `sftp` |
| `FTP_PORT` | `21` | `21` for FTP/FTPS, `22` for SFTP |
| `FTP_SERVER_DIR` | `/public_html/database/` | **Must end with a slash** |

### Host-side setup

1. Create a dedicated FTP/SFTP user whose home or start folder is `public_html/database/`.
2. Enable **FTPS** (explicit TLS) or SFTP. Avoid plain FTP if the host supports encryption.
3. Do not give the deploy user access to `public_html` root, `configuration.php` or Joomla's administrator folder.
4. If the host has a firewall, allow the server to accept FTP/SFTP from GitHub Actions. GitHub's runner IPs are dynamic, so an IP allowlist is not practical; use strong credentials and TLS instead.
5. The target folder should contain only the catalogue. The workflow does not delete unrelated files (`dangerous-clean-slate: false`), but keeping the folder dedicated avoids surprises.

### First deployment

1. Upload the site once manually (Option A) so the folder exists.
2. Add the six secrets.
3. Run **Actions → Deploy static site (FTP/SFTP) → Run workflow**.
4. Check the workflow log and then load `/database/` in a private window.

If the host requires **key-based SFTP only**, this action (password-based) will not work. In that case use manual uploads, or ask the host for an FTPS account, or replace the action with an SFTP key action.

---

## 7. Caching and cache purging

After a deployment, the host, a CDN (Cloudflare) or LiteSpeed Cache may still serve old CSS/JS/images.

- Purge the Joomla/CDN cache after each deploy.
- Or hard-refresh: **Ctrl+F5** (Windows) / **Cmd+Shift+R** (Mac).
- Optionally set short cache lifetimes for `assets/js/data.js` (monthly changes) and longer ones for images/fonts. Example for Apache with `mod_headers`:

```apache
<FilesMatch "\.html$">
  Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
<FilesMatch "data\.js$">
  Header set Cache-Control "public, max-age=3600"
</FilesMatch>
```

Only add this if `mod_headers` is enabled; otherwise leave caching to the host.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank page | `assets/js/data.js` not uploaded or wrong path | Re-extract the zip; confirm `assets/js/data.js` exists |
| 404 on `/database/` | Files extracted into a nested folder | Move `index.html` and `assets/` up one level |
| Images missing | `assets/img/` incomplete, or Linux case mismatch | Re-upload `assets/img/`; keep exact lowercase names |
| Layout looks unstyled | `assets/css/` blocked or cached | Check the network tab; purge cache |
| Wrapper shows double headers | `?embed=1` missing | Add it to the Wrapper URL |
| Wrapper has double scrollbars | Fixed iframe height too small | Increase height or use Option A |
| Joomla editor removes the iframe | Editor filters HTML | Use **No Editor** or a Custom HTML module with editor off |
| FTP `530` | Wrong username/password or protocol | Re-check secrets; try `ftps` vs `ftp` |
| FTP `425` | Passive-mode/firewall problem | Ask the host to allow passive FTP |
| Old version after deploy | Cache | Purge host/CDN cache; hard refresh |

The app has **no server-side component**, so Joomla's PHP errors, extensions or database outages cannot break the catalogue. Conversely, the catalogue cannot modify Joomla content or its database.

---

## 9. Privacy and licensing

- Collection and wishlist lists are stored in the visitor's browser (`localStorage`) only. Nothing is sent to the host or to Joomla.
- The catalogue is read-only for visitors; only maintainers change it through the repository and a new deployment.
- Photographs are CC0 / CC BY / CC BY-SA / public domain, with visible attribution and licence links. **Keep the credit panel and licence text intact** when re-hosting.
- Taxonomy and registration facts come from the ICPS Carnivorous Plant Names Resource.

---

## 10. Handover checklist

- [ ] `public_html/database/index.html` exists and loads.
- [ ] `public_html/database/assets/` contains `css`, `fonts`, `img`, `js`.
- [ ] `/database/?embed=1` hides the app header/footer and shows the back bar.
- [ ] Joomla menu item added (External URL or Wrapper).
- [ ] Optional: six FTP secrets added and the deploy workflow run successfully.
- [ ] Cache purged; site checked in a private window and on mobile.
- [ ] Photo credits and licence text still visible.
