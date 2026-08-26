# 🍌 Higgsfield Studio

A simple image generation web app wired directly to Higgsfield's official MCP
server. Pick a model, write a prompt, pick the resolution, how many images, and
the aspect ratio. That's it.

No API key, no Claude in the middle: the app itself is the MCP client.

```
Browser ──► Next.js route handler ──► MCP client ──► https://mcp.higgsfield.ai/mcp
                                       (OAuth 2.1 + PKCE)
```

## How the connection works

Higgsfield's MCP server has no API keys. It authenticates with OAuth and allows
**Dynamic Client Registration**, which means this app can introduce itself at
runtime:

1. `GET /api/auth/start` runs the MCP SDK's `auth()` orchestrator
2. That discovers `/.well-known/oauth-protected-resource` (RFC 9728) and the
   authorization server metadata (RFC 8414)
3. It registers this app at `https://mcp.higgsfield.ai/oauth2/register`
4. It generates a PKCE challenge and hands us an authorize URL, which we 302 to
5. You log in with your normal Higgsfield account (it forwards to Clerk)
6. Higgsfield redirects to `/api/auth/callback?code=...`, we exchange the code
   for tokens and store them in `.data/store.json`

From then on every generation opens a short-lived authenticated MCP session,
calls the image tool, and closes it.

> **Credits:** generating through MCP always deducts Higgsfield credits at
> standard rates, even on plans that include Unlimited access on the web.
> Unlimited and free generations only apply on higgsfield.ai itself.

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and hit **Connect Higgsfield**.

New to the terminal? `SETUP-TAGALOG.md` walks through it step by step for
Windows.

### Deploying

Set `APP_URL` to the app's public origin, e.g.
`APP_URL=https://studio.yourdomain.com`. The OAuth `redirect_uri` is derived
from it, so if it's wrong the login bounces back with a mismatch error. Changing
`APP_URL` automatically triggers a fresh client registration.

On a platform with an ephemeral filesystem (Vercel, etc.), point `DATA_DIR` at a
persistent volume, otherwise you'll be re-authenticating and losing the gallery
on every cold start. A small VPS or a Fly.io volume is the easier path.

## Models and ratios

The picker leads with three models, then puts every other image model the server
offers one click away in a dropdown:

| Slug sent | Higgsfield's name | Actual model | Ratios | Resolution / quality |
| --- | --- | --- | --- | --- |
| `nano_banana_2` | Nano Banana Pro | Gemini 3 Pro Image | 10 | 1k / 2k / 4k |
| `nano_banana_flash` | Nano Banana 2 | Gemini 3.1 Flash | 10 | 1k / 2k / 4k |
| `gpt_image_2` | GPT Image 2 | OpenAI | 7 | 1k / 2k / 4k + low/med/high |
| `text2image_soul_v2` | Higgsfield Soul V2 | — | 7 | quality 1.5k / 2k |

### Read the slug, not the name

Nano Banana Pro and Nano Banana 2 are genuinely different models. Pro is Gemini 3
Pro Image: higher quality, better in-frame text, slower, roughly double the cost.
Nano Banana 2 is Gemini 3.1 Flash: 2-3x faster at about half the price, and close
to Pro quality for most shots.

The trap is that **Higgsfield's slugs read backwards from their names.** Per
[their own CLI reference](https://github.com/higgsfield-ai/cli/blob/main/MODELS.md),
`nano_banana_2` is the one they call "Nano Banana Pro", and `nano_banana_flash` is
the one they call "Nano Banana 2". That is internally consistent — "flash" really
is the Flash architecture — but it is very easy to pick the wrong one.

So the UI shows the **raw slug as the primary label** on every model card, with
the friendly name and architecture underneath. The slug is what gets sent and
billed, so the slug is what you should trust. `nano_banana_pro` is also listed as
its own entry in case the MCP server exposes that slug separately; it is
deliberately not aliased onto `nano_banana_2`, so it can never be silently folded
into a different model.

### Ratios are filtered per model

**This matters.** The MCP server exposes one image tool for every model, so its
`aspect_ratio` enum is the *union* of what all models accept. Pick 4:5 out of that
union with GPT Image 2 selected and the call fails, because GPT Image 2 only does
1:1, 4:3, 3:4, 16:9, 9:16, 3:2 and 2:3. So `lib/models.ts` keeps per-model
constraints and intersects them with the live schema — the schema stays
authoritative, the catalog only ever narrows.

Switching models keeps your intent: going from `nano_banana_2` at 4:5 to
`gpt_image_2` moves you to 3:4, the nearest legal *portrait* ratio, rather than
dumping you on 1:1. If an illegal pair still reaches the API it's rejected with a
clear message **before** the tool call, so it costs no credits.

## Reference images

Three ways to add one, because people reach for whichever is nearest: the `+`
button on the prompt bar, dragging image files onto the bar, or pasting an image
straight from the clipboard.

The count is capped at whatever the selected model accepts — 14 for
`nano_banana_2`, 8 for `gpt_image_2`, exactly 1 for Soul V2 — and switching to a
stricter model trims the list.

One real limitation, surfaced in the UI rather than hidden: **Higgsfield fetches
reference images from its own servers.** A pasted hosted URL always works. An
upload only works once this app is deployed somewhere public, because nothing
outside your machine can read a `localhost` address. The app detects this and
warns instead of failing silently.

## Number of images

Capped at 3, since each one costs credits.

Only a couple of Higgsfield's image models expose a batch parameter. When the
tool has one, it's used. When it doesn't, the app fans out to concurrent calls
instead — otherwise asking for 3 images would quietly return 1. Either way the
results land in a single gallery entry, and a partial failure keeps whatever
rendered rather than discarding images you already paid for.

### Counting images honestly

A single generated image can arrive by more than one route in one response: a CDN
URL *and* an inline base64 copy, or the same payload reachable by two paths
through the JSON. Treating those as separate results makes one render look like
two — typically as two files with different extensions, a `.webp` and a `.png` of
the identical picture.

Two guards prevent that. The result walker claims an image content block's `data`
field so the same payload can't be captured twice under a default mime type, and
every image is content-hashed before being written, so byte-identical copies are
discarded no matter which representation they arrived in. If that means fewer
images come back than were requested, the UI says so explicitly rather than
padding the count with duplicates.

## Why it survives Higgsfield changing their schema

None of Higgsfield's argument names are hardcoded. On connect the app reads the
tool's JSON Schema over MCP and works out which field is the prompt, model,
aspect ratio, resolution and quality — by scoring candidate names, resolving
`$ref` into `$defs`, merging `allOf`, unioning `anyOf` branches, and descending
into a single wrapper object if the arguments are nested. Anything it doesn't
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

## The Inspector tab

The escape hatch. It shows the live tool list, the raw `inputSchema` with a copy
button, how the app mapped its controls onto that schema, and a per-model table
of every ratio, resolution and quality value it will let you pick.

If the prompt field is ever not identified, the Inspector says so explicitly and
the raw schema is one click from your clipboard — that JSON is the only thing
that explains why.

## Verifying it

```bash
npm run typecheck
npm run verify     # 38 assertions, no network or auth needed
```

`scripts/verify-logic.ts` feeds simulated schemas through the real
analyze/resolve/build path. It covers the per-model narrowing, argument mapping,
and result parsing — plus a section of deliberately awkward schema shapes
(`$ref`, `allOf`, top-level `anyOf`, wrapper objects, oddly named prompt fields)
that exists because a live run once failed with "no field that looks like a
prompt".

## Layout

```
app/
  api/auth/{start,callback,status,logout}   OAuth handshake
  api/tools          live tool + schema introspection
  api/generate       build args, call the tool, mirror images
  api/job/[id]       poll one in-flight generation
  api/asset/[name]   serve mirrored images
  api/gallery        list / delete history
lib/
  oauth.ts       OAuthClientProvider backed by the JSON store
  mcp.ts         session lifecycle, tool list, tool call
  tools.ts       schema introspection and field matching
  models.ts      per-model ratio / resolution constraints
  extract.ts     defensive result parsing
  generate.ts    argument building, validation, batching, polling
components/      the studio UI
scripts/
  verify-logic.ts  offline assertions over simulated schemas
```

## Notes

- **Single tenant by design.** `.data/store.json` holds one live Higgsfield
  session — yours. It is gitignored. Treat it like a password, and don't expose
  this app publicly without putting auth in front of it, or you're handing out
  your credits.
- **No reference images.** Higgsfield fetches reference images from its own
  servers, so a `localhost` URL can never load. Rather than ship a control that
  silently does nothing, it's left out until the app is deployed somewhere
  public.
- Video, Soul characters and audio are on the same MCP server. The Inspector tab
  lists those tools; wiring one up follows the same pattern as `lib/generate.ts`.
