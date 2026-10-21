# Nilorix Storefront — updated design preview

Responsive static storefront for Nilorix, built with HTML, CSS, and vanilla JavaScript. The current version includes the Currency and Top up dropdown menus, separate product detail views, compact R icon for Roblox Robux, quantity-based per-unit pricing, crypto payment UI, a yellow notification bell, a circular account avatar, a floating support button, footer links, and empty customer reviews that explicitly state they appear only after a verified completed order.

## Publish updates to your existing Cloudflare Pages site
1. Download and extract this ZIP.
2. Open your existing GitHub repository (`tarekpc01-hash/tz`).
3. Choose **Add file → Upload files**.
4. Upload/replace `index.html`, `styles.css`, `app.js`, `favicon.svg`, `_headers`, `README.md`, and `nilorix-logo.png` from this folder. Ensure they are in the repository root (not nested inside another folder).
5. Scroll down and click **Commit changes** to the `main` branch.
6. Cloudflare Pages should automatically create a new deployment. In Cloudflare, open Workers & Pages → your Pages project → Deployments and wait for the green success check.
7. Refresh `https://nilorix.com` using Ctrl+F5.

## Important limitations
- This is a front-end preview. No crypto payment is processed and no real order is created.
- Sign-in/account persistence, verified orders, real notification delivery/audio, real customer support chat, and database-backed reviews need a backend/authentication/payment provider before launch.
- Reviews are intentionally empty in this version; do not display sample or invented customer reviews.
- Product prices are demo values and should be replaced with your actual prices before selling.
- Game tiles use abstract icons rather than official game artwork. Confirm game/platform terms and applicable legal requirements before commercial launch.
