```txt
npm install
npm run db:migrate:local
npm run dev
```

```txt
npm run deploy
```

## Production notifications

Notifications are persisted in D1 and displayed in the application notification bell.
Email delivery uses the Gmail API from the Cloudflare Worker. Configure the following
values as Wrangler secrets (never commit them or expose them as `VITE_*` variables):

```txt
wrangler secret put GOOGLE_WORKSPACE_CLIENT_ID
wrangler secret put GOOGLE_WORKSPACE_CLIENT_SECRET
wrangler secret put GOOGLE_WORKSPACE_REFRESH_TOKEN
wrangler secret put GOOGLE_WORKSPACE_SENDER
```

Apply the notification migration before deploying the Worker:

```txt
npm run db:migrate:local
wrangler d1 migrations apply advising_log_db --remote
```

If Gmail credentials are not configured, in-app notifications are still stored but
email delivery is marked `failed` with an explicit provider error. The application
does not silently report an email as sent.

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
