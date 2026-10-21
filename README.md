# Nilorix Storefront — Demo

Responsive static storefront built with HTML, CSS, and vanilla JavaScript. No build step or paid hosting required for the first version.

## Run locally
Open `index.html` in a browser. Or run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.

## Publish using GitHub + Cloudflare Pages
1. Create a GitHub repository such as `nilorix-store`.
2. Upload all files in this folder to the repository root. `index.html`, `styles.css`, and `app.js` must be at the root.
3. In Cloudflare Dashboard, open **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
4. Choose the repository. Use **Framework preset: None**, leave the build command empty, and set the build output directory to `.` (or `/` if that is what the dashboard offers).
5. Deploy and test the generated `*.pages.dev` URL.
6. In the Pages project, open **Custom domains** → **Set up a custom domain** → enter `nilorix.com`, then follow Cloudflare's exact DNS instructions. Optionally add `www.nilorix.com` too.

## Important
- The supplied Nilorix logo is included as `nilorix-logo.png` and used in the header, hero, and promo section.\n- Products and prices are placeholders. Replace them before launch.
- Cart is browser-only. No orders are stored, and checkout does not collect payment.
- Newsletter signup is also a demo and does not save addresses.
- Before real sales, add a backend/database, secure admin login, legal/refund/privacy pages, and a payment provider that supports your country and digital-goods business. Never store card details yourself.
- Do not delete existing DNS records unless you understand what they do.
