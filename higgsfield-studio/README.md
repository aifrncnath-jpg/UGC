# 🍌 Higgsfield Studio

Your own image generation front end, wired directly to Higgsfield's official MCP
server. Pick your model — **Nano Banana Pro**, **GPT Image 2**, Soul V2 and the
rest — pick your ratio, generate. No API key, no Claude in the middle: the app
itself is the MCP client.

```
Browser ──► Next.js route handler ──► MCP client ──► https://mcp.higgsfield.ai/mcp
                                       (OAuth 2.1 + PKCE)
```

## How the connection actually works

Higgsfield's MCP server has no API keys. It authenticates with OAuth and allows
**Dynamic Client Registration**, which means this app can introduce itself at
runtime:

1. `GET /api/auth/start` runs the MCP SDK's `auth()` orchestrator.
2. That discovers `/.well-known/oauth-protected-resource` (RFC 9728) and the
   authorization server metadata (RFC 8414).
3. It registers this app at `https://mcp.higgsfield.ai/oauth2/register` and gets
   back a `client_id`.
4. It generates a PKCE challenge and hands us an authorize URL, which we 302 to.
5. You log in with your normal Higgsfield account (it forwards to Clerk).
6. Higgsfield redirects to `/api/auth/callback?code=...`, we exchange the code
   for tokens, and store them in `.data/store.json`.

From then on every generation opens a short-lived authenticated MCP session,
calls `generate_image`, and closes it.

> **Credits:** generating through MCP always deducts Higgsfield credits at
> standard rates, even on plans that include Unlimited access on the web.
> Unlimited and free generations only apply on higgsfield.ai itself.

## Running it

```bash
npm install
cp .env.example .env.local     # optional for localhost, required when deployed
npm run dev
```

Open <http://localhost:3000> and hit **Connect Higgsfield**.

### Deploying

Set `APP_URL` to the app's public origin, e.g.
`APP_URL=https://studio.yourdomain.com`. The OAuth `redirect_uri` is derived
from it, so if it's wrong the login bounces back with a mismatch error. Changing
`APP_URL` automatically triggers a fresh client registration.

On a platform with an ephemeral filesystem (Vercel, etc.), point `DATA_DIR` at a
persistent volume, otherwise you'll be re-authenticating and losing the gallery
on every cold start. A small VPS or Fly.io volume is the easier path.

## Models and ratios

The model picker leads with the three worth reaching for, then puts everything
else the server offers one click away:

| Model | Slug sent | Ratios | Res / quality | Refs |
| --- | --- | --- | --- | --- |
| **Nano Banana Pro** | `nano_banana_2` | 10 incl. 9:16, 16:9, 4:3, 1:1, 4:5, 21:9 | 1k / 2k / 4k | 14 |
| **GPT Image 2** | `gpt_image_2` | 7 incl. 9:16, 16:9, 4:3, 1:1 | 1k / 2k / 4k + low/med/high | 8 |
| **Higgsfield Soul V2** | `text2image_soul_v2` | 7 | 1.5k / 2k | 1 |

Note that Nano Banana Pro's slug is `nano_banana_2`, not `nano_banana_pro` —
Higgsfield's display name and job type don't line up, which is the kind of thing
that silently sends you to the wrong model.

**Ratios are filtered per model, and this matters.** The MCP server exposes one
`generate_image` tool for every model, so its `aspect_ratio` enum is the *union*
of what all models accept. Pick 4:5 out of that union with GPT Image 2 selected
and the call fails, because GPT Image 2 only does 1:1, 4:3, 3:4, 16:9, 9:16, 3:2
and 2:3. So `lib/models.ts` keeps per-model constraints and intersects them with
the live schema — the schema stays authoritative, the catalog only ever narrows.

Switching models keeps your intent: go from Nano Banana Pro at 4:5 to GPT Image
2 and it moves you to 3:4, the nearest legal *portrait* ratio, rather than
dumping you on 1:1. If an illegal pair still reaches the API it's rejected with a
clear message **before** the tool call, so it costs no credits.

## What's in the UI

**Generate** — Subject box plus a style preset that carries the look, so your
prompt stays about *who and what*. Model cards, aspect-ratio tiles drawn to scale
(9:16 first, since that's the usual target), per-model resolution and quality,
and reference images capped at each model's real limit.

**Gallery** — Every generation with the exact MCP arguments that produced it, so
you can rerun a winning look on a new subject. Images are mirrored to
`.data/outputs` the moment they arrive, because Higgsfield's CDN links are signed
and expire.

**Inspector** — The escape hatch. Live tool list, the raw `inputSchema`, how this
app mapped its controls onto that schema, and a per-model table of every ratio,
resolution and quality value it will let you pick.

## Why it survives Higgsfield changing their schema

None of Higgsfield's argument names are hardcoded. On connect the app reads the
tool's JSON Schema over MCP and works out which field is the prompt, which is the
model, which is the aspect ratio, and what the legal values are — by scoring
candidate names and unwrapping `anyOf`/`oneOf` optionals. Anything it doesn't
recognise still shows up as a typed control in the **Advanced** panel, generated
from the schema. Unknown keys are dropped rather than sent, since the server
rejects unexpected properties.

Response parsing is equally defensive: the extractor walks the whole tool result
— `structuredContent`, text blocks, JSON-in-a-string, base64 image blocks — and
pulls out anything that looks like an image URL, a job id, or a status, instead
of assuming one response shape.

If a generation comes back as a job id rather than an image, the server polls the
status tool with a backing-off delay, then hands the job to the browser to keep
polling.

A model the catalog has never heard of still works on day one: it appears in the
picker with the full schema-wide options rather than being hidden.

## Verifying it

```bash
npm run typecheck
npm run verify     # 27 assertions, no network or auth needed
```

`scripts/verify-logic.ts` feeds a simulated `generate_image` schema — shaped like
Higgsfield's, with one shared `aspect_ratio` enum — through the real
analyze/resolve/build path and asserts the interesting cases: that `anyOf`
optionals are unwrapped, that GPT Image 2 loses 4:5 while Nano Banana Pro keeps
it, that unknown fields are dropped rather than sent, that an illegal combination
throws before any tool call, and that the result parser handles URLs in text,
`structuredContent`, JSON-in-a-string, and base64 blocks.

## Style presets

Tuned for UGC ads, VSL b-roll, DTC/ecom product shots, and health/supplement
creatives in vertical 9:16:

| Preset | Use it for |
| --- | --- |
| Disney / Pixar 3D feature | Default hero look. Glossy skin and depth of field are load-bearing, never negative them. |
| Disney / Pixar 3D — mature adult | When the character must read as a grown adult; the style biases faces young, so age is stated explicitly. |
| Handmade stop-motion claymation | Grounded practical look, deep focus, no bokeh. |
| UGC selfie / phone camera | The scroll-stopper. Looks like a real person filmed it. |
| DTC ecom product hero | Clean commercial product shot. |
| Health / supplement flat lay | Wellness palette with space for caption text. |
| Cinematic b-roll frame | Starting frame for image-to-video, composed for a push-in. |
| Talking head / avatar base | Head-on and evenly lit, easy for a lipsync or avatar pass. |

Edit `lib/presets.ts` to add your own.

## Notes and limits

- **Reference images must be publicly reachable.** Higgsfield fetches them from
  its own servers, so a `localhost` URL will never load. Uploads work once the
  app is deployed or tunnelled; the UI warns you when it can tell.
- **Single tenant by design.** `.data/store.json` holds one live Higgsfield
  session — yours. It is gitignored. Treat it like a password, and don't expose
  this app publicly without putting auth in front of it, or you're handing out
  your credits.
- Video generation, Soul characters, and audio are all on the same MCP server.
  The Inspector tab lists those tools; wiring them up is the same pattern as
  `lib/generate.ts`.

## Layout

```
app/
  api/auth/{start,callback,status,logout}   OAuth handshake
  api/tools          live tool + schema introspection
  api/generate       build args, call the tool, mirror images
  api/job/[id]       poll one in-flight generation
  api/asset/[name]   serve mirrored images
  api/upload         store a reference image
  api/gallery        list / delete history
lib/
  oauth.ts       OAuthClientProvider backed by the JSON store
  mcp.ts         session lifecycle, tool list, tool call
  tools.ts       schema introspection and field matching
  models.ts      per-model ratio / resolution / reference constraints
  extract.ts     defensive result parsing
  generate.ts    argument building, validation, status polling
  presets.ts     style presets
components/      the studio UI
scripts/
  verify-logic.ts  offline assertions over a simulated schema
```
