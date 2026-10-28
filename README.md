# CEOSandbox shared library host

The one place `ceosandbox.css` and `ceosandbox.js` live. Every simulation links to them; nothing is ever pasted into an app. This is the mechanism that gives a fleet of static single-file apps the property people assume only a framework provides: fix a component once, forty apps inherit it, with no build step and nothing to redeploy.

```
ceosandbox-host/
├── netlify.toml          cache and security headers
├── index.html            what this host is, and what it serves
├── smoke/index.html      component gallery — the drift check
└── v1/
    ├── ceosandbox.css    tokens + base components (Design System §13.2, §9)
    └── ceosandbox.js     UI components (Build Standard §3.2)
```

---

## Deploy

1. Create a repository (`ceosandbox-lib`) and push this folder to it.
2. In Netlify: **Add new site → Import an existing project**, pick the repo. Publish directory `.`, no build command. `netlify.toml` already sets both.
3. **Point a subdomain you own at it.** In Netlify → Domain management, add `lib.ceosandbox.com`, then add the CNAME your DNS provider asks for.
4. Set `CEOSANDBOX_HOST = https://lib.ceosandbox.com` and use it in every app.
5. Open `https://lib.ceosandbox.com/smoke/` and confirm every component renders.

**Use your own subdomain, not the `*.netlify.app` URL.** The provider name would otherwise be baked into forty HTML files, and changing hosts in three years would mean editing all of them. A subdomain you control makes the host swappable and costs nothing today. This is the single most valuable decision in the whole setup.

GitHub Pages works identically if you prefer it — the only loss is `netlify.toml`, so the cache headers below would need setting another way. Netlify is the better fit because the AI proxy will need functions on the same host later.

---

## Linking from an app

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://lib.ceosandbox.com/v1/ceosandbox.css">
...
<script src="https://lib.ceosandbox.com/v1/ceosandbox.js"></script>
<script>/* app logic */</script>
```

No Subresource Integrity on these two files. SRI pins a hash, and a pinned hash would block exactly the safe fixes `/v1/` exists to deliver. Pinned CDN libraries such as Chart.js are a different case — those are immutable at a version, so give them `integrity` where the CDN publishes a hash.

---

## Cache policy

`/v1/*` is served `max-age=300, stale-while-revalidate=86400`.

Repeat loads are instant, and a fix reaches every app within five minutes without anyone touching an app. Long or immutable caching would defeat the purpose of the shared library; no caching would make every sim slower to start for no benefit.

---

## Versioning

`/v1/` takes **backward-compatible changes only**: bug fixes, new components, new optional arguments. Anything that could change how an existing app renders or behaves ships as `/v2/`, and existing apps stay on `/v1/` untouched, forever if need be.

Before pushing any change to `/v1/`:

1. Open `smoke/index.html` locally and check every component still renders.
2. Open one real sim against the local library.
3. Push. Check `https://lib.ceosandbox.com/smoke/` after five minutes.

The smoke page is the whole QA process for the library. Keep it exhaustive — every component added to `ceosandbox.js` gets a section there in the same commit, or drift starts.

---

## What is in `ceosandbox.js`

| Call | Does |
| :--- | :--- |
| `CS.lead({eyebrow, title, deck})` | The signature Lead — gold rule, eyebrow, serif action title |
| `CS.briefing({lead, body, steps, deeper, action})` | Front of the self-contained loop; `deeper` opens the concept click-through in a modal |
| `CS.reflection({lead, body, habits, actions})` | Back of the loop — the takeaway screen |
| `CS.dnd({onDrop, onReturn})` | Card-to-slot drag with a full keyboard path and live-region announcements |
| `CS.chat({mount, persona, onSend})` | Briefing-note chat turns with the persistent "AI-generated" label |
| `CS.timer(node, seconds, {onEnd})` | Mono countdown; amber at 2:00, red at 0:30 |
| `CS.countUp(node, to, {unit, decimals})` | Result reveal; instant under reduced motion |
| `CS.toast(msg, {type})` · `CS.modal({...})` | Toasts; modal with focus trap and Esc |
| `CS.stepper(labels, i)` | Multi-stage progress |
| `CS.sparkline(values, {highlight})` | Dependency-free SVG trend line |
| `CS.fmt.value / change / pp` | Formats config values; percentages stored as fractions, displayed ×100 |
| `CS.chartTheme(Chart)` | Applies the Design System §10.2 Chart.js defaults, returns the categorical palette |
| `CS.confetti()` | Permitted once, for genuine top-tier success only |
| `CS.token('--navy-700')` | Reads a CSS custom property so JS stays token-driven |
| `CS.requireWideViewport(msg)` | Desktop-first gate below 1024px |

Deliberately **not** included: allocation sliders and the 2×2 matrix. Both are specified in the Build Standard, but neither has a consumer yet — they belong to the BCG portfolio sim and should be written against that app's real requirements rather than guessed at now. Add them to `/v1/` and to the smoke page when BCG is built.

---

## Still to decide

**`ceosandbox-agents.js`** ships with the first AI simulation (Interview Lab or Arvind). It is the prompt-layer equivalent of `ceosandbox.js`: the five role scaffolds, the hidden-state parser, and the three safety valves. Writing it before a real sim exercises it would produce an abstraction fitted to nothing.

**The AI proxy** is a Netlify function on this same host, at `/.netlify/functions/chat`. It needs three decisions that are genuinely open, and none of them can be inferred from the governing documents:

- **How an entitlement token is issued and verified.** The proxy must reject tokenless calls, but the membership gate does not exist yet, so there is nothing to issue tokens. A signed short-lived JWT from the gate is the obvious shape; the gate has to come first.
- **Where rate-limit state lives.** Netlify functions are stateless. Netlify Blobs is the low-friction option; Upstash Redis is the sturdier one. This decides itself once expected volume is known.
- **The model allowlist.** Haiku is the default per the Build Standard; which sims may request more, and on what grounds, is a cost question.

Build the proxy when the first AI sim is ready to test, not before. An unused proxy is an open invoice with nothing on the other end of it.
