# Study progress sync

Ticking a study step on one device should show up on the other. This needs a
GitHub token, and a token cannot live in `index.html` because that file is public.
So a small Cloudflare Worker holds it instead. The page talks to the worker, the
worker talks to GitHub.

Free tier covers this comfortably. No card required.

---

## 1. Make a fine grained token

GitHub → Settings → Developer settings → **Personal access tokens** →
**Fine-grained tokens** → Generate new token.

| Field | Value |
|---|---|
| Name | `wmm-study-sync` |
| Expiration | 1 year |
| Repository access | **Only select repositories** → `watson-mountain-schedule` |
| Permissions → Contents | **Read and write** |

Nothing else. Do not use a classic `ghp_` token: those reach every repo on the
account, and this one only ever needs to edit one file in one repo.

Copy the token. It is shown once.

## 2. Create the worker

1. Go to `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Start with Hello World** → Deploy.
2. Rename it something like `wmm-sync`.
3. **Edit code**, delete what is there, paste the whole of `sync-worker.js` from this repo, Deploy.

## 3. Add the token as a secret

Worker → **Settings** → **Variables and Secrets** → Add.

| Name | Type | Value |
|---|---|---|
| `GITHUB_TOKEN` | Secret | the token from step 1 |
| `SYNC_KEY` | Secret | any random string, optional but recommended |

Secrets are encrypted and never appear in the code or in any response.

`SYNC_KEY` is a light lock on the endpoint. The page has to carry it, so treat it
as a speed bump rather than a real secret. It is worth setting because without it
anyone who finds the worker URL can tick study steps. It is not worth worrying
about beyond that, because ticking study steps is the only thing this endpoint
can do.

## 4. Point the page at it

Copy the worker URL, something like `https://wmm-sync.<subdomain>.workers.dev`.

In `index.html` find:

```js
var SYNC_URL = "";
var SYNC_KEY = "";
```

Fill both in and push. The **Copy sync code** button becomes **Sync now**.

## 5. Check it

1. Open the dashboard, tick a study step. The strip should read `1 step ticked on this device only`.
2. Press **Sync now**. It should say `Synced`.
3. Check the repo. There should be a new commit, *Study progress from the dashboard*, and `studyProgress` in `updates.json` should contain the step id.
4. Open the dashboard on the other device. The step should already be ticked.

## If it does not work

| Symptom | Cause |
|---|---|
| `bad key` | `SYNC_KEY` in the page does not match the worker secret |
| `read failed` / `write failed` | Token lacks Contents write, or is not scoped to this repo |
| Nothing happens, console shows CORS | `ORIGIN` at the top of the worker does not match the site URL |
| `busy, try again` | Both devices wrote at once three times running. Press it again. |

## What this cannot do

Progress is a flat list of step ids. It does not record who ticked what or when.
If a step is unticked on one device and ticked on another, last write wins.

Local ticks always take priority on the device that made them, so the page never
waits on the network to respond to a tap.
