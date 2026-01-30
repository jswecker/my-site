# 🎶 Party Jukebox

Party Jukebox is a live song-request web app built with **Astro**, **Cloudflare Pages Functions**, and **Cloudflare D1**.  
Users can search for tracks, submit requests, and vote on songs in real time.

---

## 🧱 Tech Stack

- **Frontend:** Astro
- **Backend:** Cloudflare Pages Functions (`functions/api/*`)
- **Database:** Cloudflare D1 (SQLite)
- **Local Dev & Deploy:** Wrangler
- **Hosting:** Cloudflare Pages

---

## 📁 Project Structure

```text
/
├── public/                  # Static assets
├── src/                     # Astro frontend
│   ├── components/
│   ├── layouts/
│   └── pages/
├── functions/               # Cloudflare Pages Functions
│   └── api/
│       ├── requests.get.ts
│       ├── request.post.ts
│       ├── vote.post.ts
│       └── ...
├── migrations/              # D1 SQL migrations
├── dist/                    # Astro build output (generated)
├── wrangler.toml
└── package.json
```

## Local Development/Testing:
```
npm install
npm run build
wrangler d1 migrations apply party_jukebox_db --local
wrangler pages dev dist --local
```
### Delete Local Wrangler state
```
# macOS / Linux
rm -rf .wrangler/state
# Windows PowerShell
Remove-Item -Recurse -Force .\.wrangler\state
```