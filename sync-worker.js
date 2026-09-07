/**
 * Study progress sync for the Watson Mountain dashboard.
 *
 * The page never sees a GitHub token. It POSTs a list of step ids here, and this
 * worker merges them into studyProgress in updates.json using a token that stays
 * in Cloudflare's secret store.
 *
 * Deploy: see SYNC-SETUP.md in the same repo.
 */

const REPO   = "preetham3r/watson-mountain-schedule";
const FILE   = "updates.json";
const BRANCH = "main";
const ORIGIN = "https://preetham3r.github.io";

/* Hard caps. This endpoint is public, so the worst a stranger can do is tick
   study steps. Anything outside these bounds is rejected outright. */
const MAX_MARKS   = 400;                                   // total ids kept in the file
const MAX_PER_REQ = 60;                                    // ids accepted in one call
const ID_SHAPE    = /^\d{4}-\d{2}-\d{2}\|[^|]{1,120}\|\d{1,3}$/;

function cors(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", ORIGIN);
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, X-Sync-Key");
  h.set("Access-Control-Max-Age", "86400");
  return new Response(res.body, { status: res.status, headers: h });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" }
  });
}

/* only well formed step ids survive */
function clean(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const v of list) {
    if (typeof v === "string" && ID_SHAPE.test(v) && out.indexOf(v) < 0) out.push(v);
    if (out.length >= MAX_PER_REQ) break;
  }
  return out;
}

function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (request.method !== "POST")    return cors(json({ error: "POST only" }, 405));

    /* optional shared key. Set SYNC_KEY in the worker and syncKey in the page
       to stop drive by requests. Leave both unset and the endpoint is open. */
    if (env.SYNC_KEY && request.headers.get("X-Sync-Key") !== env.SYNC_KEY) {
      return cors(json({ error: "bad key" }, 403));
    }

    let body;
    try { body = await request.json(); }
    catch { return cors(json({ error: "bad json" }, 400)); }

    const done   = clean(body.done);
    const undone = clean(body.undone);
    if (!done.length && !undone.length) return cors(json({ error: "nothing to sync" }, 400));

    const gh = (path, init = {}) =>
      fetch(`https://api.github.com/repos/${REPO}/${path}`, {
        ...init,
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "wmm-study-sync",
          ...(init.headers || {})
        }
      });

    /* two devices can tick at once, so retry a lost race rather than dropping it */
    for (let attempt = 0; attempt < 3; attempt++) {
      const read = await gh(`contents/${FILE}?ref=${BRANCH}`);
      if (!read.ok) return cors(json({ error: "read failed", status: read.status }, 502));
      const meta = await read.json();

      let data;
      try { data = JSON.parse(b64decode(meta.content)); }
      catch { return cors(json({ error: "updates.json is not valid json" }, 500)); }

      const set = new Set(Array.isArray(data.studyProgress) ? data.studyProgress : []);
      for (const id of done)   set.add(id);
      for (const id of undone) set.delete(id);
      data.studyProgress = Array.from(set).slice(-MAX_MARKS);

      const write = await gh(`contents/${FILE}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Study progress from the dashboard",
          content: b64encode(JSON.stringify(data, null, 2) + "\n"),
          sha: meta.sha,
          branch: BRANCH
        })
      });

      if (write.ok) return cors(json({ ok: true, count: data.studyProgress.length }));
      if (write.status !== 409) {
        return cors(json({ error: "write failed", status: write.status }, 502));
      }
      /* 409 means someone else wrote first. Read again and reapply. */
    }

    return cors(json({ error: "busy, try again" }, 503));
  }
};
