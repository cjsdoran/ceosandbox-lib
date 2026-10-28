/* ============================================================================
   ceosandbox.js — v1
   Framework-free UI components shared by every CEOSandbox sim.
   Governed by the CEOSandbox Build Standard §3.2 and Project Context §3.2.

   Exposes one global: CS
   No dependencies. No build step. Safe to load with a plain <script src>.

   A component used twice belongs in here. Apps hold only their own logic.
   ========================================================================= */
(function (global) {
  "use strict";

  var CS = {
    version: "1.0.0",

    /* ── Small helpers ────────────────────────────────────────────────── */

    /** Create an element. CS.el('div', {class:'card'}, [child, 'text']) */
    el: function (tag, attrs, children) {
      var node = document.createElement(tag);
      attrs = attrs || {};
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else node.setAttribute(k, v === true ? "" : v);
      });
      CS._append(node, children);
      return node;
    },

    _append: function (node, children) {
      if (children === null || children === undefined) return;
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
      });
    },

    /** Read a CSS custom property so JS (and Chart.js) stays token-driven. */
    token: function (name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },

    reducedMotion: function () {
      return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },

    /* ── Number formatting ────────────────────────────────────────────────
       Percentages are stored as fractions everywhere in CEOSandbox config
       and displayed x100. `decimals` comes from the config file.            */
    fmt: {
      /** CS.fmt.value(0.849, '%', 1) -> "84.9%"  ·  CS.fmt.value(4921, '$m/yr', 0) -> "4,921" */
      value: function (v, unit, decimals) {
        if (v === null || v === undefined || isNaN(v)) return "—";
        var d = decimals === undefined ? 1 : decimals;
        if (unit === "%") return CS.fmt.num(v * 100, d) + "%";
        return CS.fmt.num(v, d);
      },
      num: function (v, decimals) {
        return Number(v).toLocaleString("en-US", {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals
        });
      },
      /** Signed change in percentage points, for deltas on percentage metrics. */
      pp: function (from, to, decimals) {
        var d = (to - from) * 100, dp = decimals === undefined ? 1 : decimals;
        return (d >= 0 ? "+" : "\u2212") + CS.fmt.num(Math.abs(d), dp) + "pp";
      },
      /** Signed percentage change. Carries a sign so meaning is never colour-only. */
      change: function (from, to, decimals) {
        if (!from) return "—";
        var d = ((to - from) / Math.abs(from)) * 100, dp = decimals === undefined ? 1 : decimals;
        return (d >= 0 ? "+" : "\u2212") + CS.fmt.num(Math.abs(d), dp) + "%";
      }
    },

    /* ── The Lead (Design System §2) ──────────────────────────────────────
       One per screen. Title must be a sentence with a takeaway.
       CS.lead({eyebrow, title, deck, size:'lg'|'xl', html:true})            */
    lead: function (opts) {
      var wrap = CS.el("div", { class: "lead" + (opts.size ? " lead-" + opts.size : "") });
      wrap.appendChild(CS.el("span", { class: "lead-rule", "aria-hidden": "true" }));
      if (opts.eyebrow) wrap.appendChild(CS.el("div", { class: "lead-eyebrow", text: opts.eyebrow }));
      var t = CS.el("h1", { class: "lead-title" });
      if (opts.html) t.innerHTML = opts.title; else t.textContent = opts.title;
      wrap.appendChild(t);
      if (opts.deck) {
        var d = CS.el("p", { class: "lead-deck" });
        if (opts.html) d.innerHTML = opts.deck; else d.textContent = opts.deck;
        wrap.appendChild(d);
      }
      return wrap;
    },

    /* ── Briefing (Project Context §4) ────────────────────────────────────
       The front of the self-contained loop. Lean by default; depth is one
       click away and never on the main path.
       CS.briefing({lead:{...}, body:[para,...], steps:[{title,text}],
                    deeper:{label, render(){...}}, action:{label, onClick},
                    before:node, after:node})                               */
    briefing: function (opts) {
      var wrap = CS.el("div", { class: "cs-briefing" });
      wrap.appendChild(CS.lead(opts.lead));
      if (opts.before) wrap.appendChild(opts.before);

      if (opts.body) {
        var body = CS.el("div", { class: "cs-briefing-body" });
        (Array.isArray(opts.body) ? opts.body : [opts.body]).forEach(function (p) {
          body.appendChild(typeof p === "string" ? CS.el("p", { html: p }) : p);
        });
        wrap.appendChild(body);
      }

      if (opts.steps && opts.steps.length) {
        var steps = CS.el("div", { class: "cs-briefing-steps" });
        opts.steps.forEach(function (s, i) {
          steps.appendChild(CS.el("div", { class: "cs-briefing-step" }, [
            CS.el("div", { class: "cs-briefing-step-n", text: String(i + 1).padStart(2, "0") }),
            CS.el("div", {}, [
              CS.el("h3", { text: s.title }),
              CS.el("p", { class: "card-deck", html: s.text })
            ])
          ]));
        });
        wrap.appendChild(steps);
      }

      if (opts.deeper) {
        wrap.appendChild(CS.el("button", {
          class: "cs-deeper", type: "button",
          onclick: function () { CS.modal({ title: opts.deeper.title, wide: true, content: opts.deeper.render() }); }
        }, [opts.deeper.label + " \u2192"]));
      }

      if (opts.after) wrap.appendChild(opts.after);

      if (opts.action) {
        wrap.appendChild(CS.el("div", { class: "cs-row-end", style: "margin-top:var(--space-8)" }, [
          CS.el("button", { class: "btn btn-primary btn-lg", type: "button", onclick: opts.action.onClick, text: opts.action.label })
        ]));
      }
      return wrap;
    },

    /* ── Reflection takeaway (Project Context §4) ─────────────────────────
       The back of the loop. Restates the lesson and links it to the wider
       framework. Never a score recap.
       CS.reflection({lead, body, habits:[{title,text}], actions:[{label,onClick,primary}]}) */
    reflection: function (opts) {
      var wrap = CS.el("div", { class: "cs-reflection" });
      wrap.appendChild(CS.lead(opts.lead));
      if (opts.body) {
        var body = CS.el("div", { class: "cs-briefing-body" });
        (Array.isArray(opts.body) ? opts.body : [opts.body]).forEach(function (p) {
          body.appendChild(typeof p === "string" ? CS.el("p", { html: p }) : p);
        });
        wrap.appendChild(body);
      }
      if (opts.habits && opts.habits.length) {
        var h = CS.el("div", { class: "cs-reflection-habits" });
        opts.habits.forEach(function (x) {
          h.appendChild(CS.el("div", { class: "cs-reflection-habit" }, [
            CS.el("h3", { text: x.title }), CS.el("p", { class: "card-deck", html: x.text })
          ]));
        });
        wrap.appendChild(h);
      }
      if (opts.actions && opts.actions.length) {
        var row = CS.el("div", { class: "cs-row-end", style: "margin-top:var(--space-8)" });
        opts.actions.forEach(function (a) {
          row.appendChild(CS.el("button", {
            class: "btn " + (a.primary ? "btn-primary btn-lg" : "btn-secondary"),
            type: "button", onclick: a.onClick, text: a.label
          }));
        });
        wrap.appendChild(row);
      }
      return wrap;
    },

    /* ── Toast (§9.11) ───────────────────────────────────────────────────
       CS.toast('Tree complete.', {type:'success', duration:4000})           */
    toast: function (message, opts) {
      opts = opts || {};
      var host = document.querySelector(".cs-toast-host");
      if (!host) { host = CS.el("div", { class: "cs-toast-host" }); document.body.appendChild(host); }
      var t = CS.el("div", {
        class: "cs-toast" + (opts.type ? " cs-toast-" + opts.type : ""),
        role: "status", "aria-live": "polite", text: message
      });
      host.appendChild(t);
      global.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, opts.duration || 4000);
      return t;
    },

    /* ── Modal (§9.11) — traps focus, closes on Esc ──────────────────────
       CS.modal({title, content, actions:[{label,onClick,primary}], wide})   */
    modal: function (opts) {
      var last = document.activeElement;
      var box = CS.el("div", { class: "cs-modal" + (opts.wide ? " cs-modal-wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": opts.title || "Dialog" });
      if (opts.title) box.appendChild(CS.el("h2", { class: "cs-modal-title", text: opts.title }));
      CS._append(box, opts.content);

      var scrim = CS.el("div", { class: "cs-scrim" }, [box]);
      function close() {
        document.removeEventListener("keydown", onKey, true);
        if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
        if (last && last.focus) last.focus();
      }
      var actions = (opts.actions || [{ label: "Close", onClick: null }]);
      var row = CS.el("div", { class: "cs-modal-actions" });
      actions.forEach(function (a) {
        row.appendChild(CS.el("button", {
          class: "btn " + (a.primary ? "btn-primary" : "btn-secondary"), type: "button", text: a.label,
          onclick: function () { if (a.onClick) a.onClick(); if (a.keepOpen !== true) close(); }
        }));
      });
      box.appendChild(row);

      function onKey(e) {
        if (e.key === "Escape") { e.stopPropagation(); close(); return; }
        if (e.key !== "Tab") return;
        var f = box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], lastF = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastF.focus(); }
        else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); first.focus(); }
      }
      scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(scrim);
      var focusable = box.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
      return { close: close, node: scrim };
    },

    /* ── Count-up (§7) — respects reduced motion ─────────────────────────
       CS.countUp(node, 0.94, {unit:'%', decimals:1, duration:600})          */
    countUp: function (node, to, opts) {
      opts = opts || {};
      var from = opts.from || 0, dur = opts.duration || 600;
      var write = function (v) { node.textContent = CS.fmt.value(v, opts.unit, opts.decimals); };
      if (CS.reducedMotion() || !global.requestAnimationFrame) { write(to); return; }
      var t0 = null;
      function frame(t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        write(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) global.requestAnimationFrame(frame);
      }
      global.requestAnimationFrame(frame);
    },

    /* ── Timer (§9.7) — mono, warns at 2:00, danger at 0:30 ──────────────
       var t = CS.timer(node, 900, {onEnd:fn}); t.start(); t.stop();          */
    timer: function (node, seconds, opts) {
      opts = opts || {};
      var left = seconds, id = null;
      node.classList.add("cs-timer");
      function render() {
        var m = Math.floor(left / 60), s = left % 60;
        node.textContent = m + ":" + String(s).padStart(2, "0");
        node.classList.toggle("cs-timer-warning", false);
        node.classList.toggle("is-warning", left <= 120 && left > 30);
        node.classList.toggle("is-danger", left <= 30);
      }
      render();
      return {
        start: function () {
          if (id) return;
          id = global.setInterval(function () {
            left--; render();
            if (opts.onTick) opts.onTick(left);
            if (left <= 0) { global.clearInterval(id); id = null; if (opts.onEnd) opts.onEnd(); }
          }, 1000);
        },
        stop: function () { if (id) { global.clearInterval(id); id = null; } },
        remaining: function () { return left; }
      };
    },

    /* ── Stepper (§9.6) ──────────────────────────────────────────────────
       CS.stepper(['Build','Diagnose','Reflect'], 1)                         */
    stepper: function (labels, currentIndex) {
      var wrap = CS.el("nav", { class: "cs-stepper", "aria-label": "Progress" });
      labels.forEach(function (label, i) {
        if (i) wrap.appendChild(CS.el("span", { class: "cs-step-sep", "aria-hidden": "true" }));
        var state = i < currentIndex ? "is-done" : i === currentIndex ? "is-current" : "";
        wrap.appendChild(CS.el("div", {
          class: "cs-step " + state, "aria-current": i === currentIndex ? "step" : null
        }, [
          CS.el("span", { class: "cs-step-dot", "aria-hidden": "true" }),
          CS.el("span", { text: label })
        ]));
      });
      return wrap;
    },

    /* ── Drag and drop, with a keyboard path (§12) ────────────────────────
       Card-to-slot placement: profit trees, issue trees, matrix sorting.

       var dnd = CS.dnd({
         onDrop: function(cardEl, slotEl){ ... return true to accept },
         onReturn: function(cardEl){ ... }        // card sent back to the pool
       });
       dnd.source(cardEl);   // make a card draggable + keyboard-liftable
       dnd.target(slotEl);   // make a slot droppable + keyboard-droppable

       Keyboard: Enter/Space on a card lifts it, Enter/Space on a slot places
       it, Escape drops the hold. Announced through a live region.           */
    dnd: function (opts) {
      opts = opts || {};
      var held = null;
      var live = CS.el("div", { class: "cs-visually-hidden", role: "status", "aria-live": "polite" });
      document.body.appendChild(live);
      function say(m) { live.textContent = m; }

      function hold(card) {
        if (held) held.classList.remove("is-held");
        held = card;
        if (card) { card.classList.add("is-held"); say((card.dataset.label || "Card") + " picked up. Choose a slot."); }
      }
      function release() { if (held) held.classList.remove("is-held"); held = null; }

      function place(card, slot) {
        var ok = opts.onDrop ? opts.onDrop(card, slot) !== false : true;
        if (ok) say((card.dataset.label || "Card") + " placed.");
        release();
        return ok;
      }

      return {
        heldCard: function () { return held; },
        source: function (card) {
          card.setAttribute("draggable", "true");
          card.setAttribute("tabindex", "0");
          card.setAttribute("role", "button");
          card.addEventListener("dragstart", function (e) {
            held = card; card.classList.add("is-dragging");
            e.dataTransfer.effectAllowed = "move";
            try { e.dataTransfer.setData("text/plain", card.dataset.id || ""); } catch (err) { /* IE guard */ }
          });
          card.addEventListener("dragend", function () { card.classList.remove("is-dragging"); });
          card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (held === card) { release(); say("Put back."); }
              else if (card.dataset.placed === "true" && opts.onReturn) { opts.onReturn(card); say("Returned to the pool."); }
              else hold(card);
            } else if (e.key === "Escape" && held) { release(); say("Cancelled."); }
          });
          return card;
        },
        target: function (slot) {
          slot.setAttribute("tabindex", "0");
          slot.addEventListener("dragover", function (e) { e.preventDefault(); slot.classList.add("is-target"); });
          slot.addEventListener("dragleave", function () { slot.classList.remove("is-target"); });
          slot.addEventListener("drop", function (e) {
            e.preventDefault(); slot.classList.remove("is-target");
            if (held) { var c = held; c.classList.remove("is-dragging"); place(c, slot); }
          });
          slot.addEventListener("keydown", function (e) {
            if ((e.key === "Enter" || e.key === " ") && held) { e.preventDefault(); place(held, slot); }
          });
          return slot;
        }
      };
    },

    /* ── AI chat panel (§9.7) ────────────────────────────────────────────
       Briefing-note turns, not chat bubbles. Used by every AI sim.
       var chat = CS.chat({mount:node, persona:'Arvind Rao', onSend:fn});     */
    chat: function (opts) {
      var log = CS.el("div", { class: "cs-chat", role: "log", "aria-live": "polite" });
      var input = CS.el("textarea", { class: "field", rows: "3", placeholder: opts.placeholder || "Type your reply" });
      var send = CS.el("button", { class: "btn btn-primary", type: "button", text: opts.sendLabel || "Send" });
      var typing = null;

      function submit() {
        var v = input.value.trim();
        if (!v) return;
        api.user(v); input.value = "";
        if (opts.onSend) opts.onSend(v);
      }
      send.addEventListener("click", submit);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
      });

      var api = {
        log: log,
        input: input,
        user: function (text) {
          log.appendChild(CS.el("div", { class: "cs-turn-user", text: text }));
          log.lastChild.scrollIntoView({ block: "nearest" });
        },
        ai: function (text) {
          api.stopTyping();
          log.appendChild(CS.el("div", { class: "cs-turn-ai" }, [
            CS.el("div", { class: "cs-turn-label" }, [
              (opts.persona || "Coach"),
              CS.el("span", { class: "cs-ai-label", style: "margin-left:var(--space-2)", text: "AI-generated" })
            ]),
            CS.el("div", { class: "cs-turn-ai-body", text: text })
          ]));
          log.lastChild.scrollIntoView({ block: "nearest" });
        },
        startTyping: function () {
          if (typing) return;
          typing = CS.el("div", { class: "cs-typing", "aria-label": "Thinking" }, [
            CS.el("span"), CS.el("span"), CS.el("span")
          ]);
          log.appendChild(typing);
        },
        stopTyping: function () { if (typing && typing.parentNode) typing.parentNode.removeChild(typing); typing = null; },
        setEnabled: function (on) { input.disabled = !on; send.disabled = !on; }
      };

      var wrap = CS.el("div", { class: "cs-narrow" }, [
        log,
        CS.el("div", { style: "margin-top:var(--space-6)" }, [
          input,
          CS.el("div", { class: "cs-row-end", style: "margin-top:var(--space-3)" }, [send])
        ])
      ]);
      if (opts.mount) opts.mount.appendChild(wrap);
      api.node = wrap;
      return api;
    },

    /* ── Confetti (§7) — permitted once, for genuine top-tier success ──── */
    confetti: function (opts) {
      if (CS.reducedMotion()) return;
      opts = opts || {};
      var n = opts.count || 80, colors = ["--cat-1", "--cat-2", "--cat-3", "--cat-4", "--gold"].map(CS.token);
      var host = CS.el("div", { style: "position:fixed;inset:0;pointer-events:none;z-index:400;overflow:hidden", "aria-hidden": "true" });
      document.body.appendChild(host);
      for (var i = 0; i < n; i++) {
        var p = CS.el("span", {
          style: "position:absolute;top:-12px;width:7px;height:11px;opacity:.9;" +
            "left:" + (Math.random() * 100) + "%;background:" + colors[i % colors.length] +
            ";transform:rotate(" + (Math.random() * 360) + "deg)"
        });
        host.appendChild(p);
        (function (node) {
          var d = 1800 + Math.random() * 1200, drift = (Math.random() - .5) * 160;
          node.animate(
            [{ transform: node.style.transform + " translate(0,0)" },
             { transform: "rotate(" + (Math.random() * 720) + "deg) translate(" + drift + "px, 105vh)" }],
            { duration: d, easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" }
          );
        })(p);
      }
      global.setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 3400);
    },

    /* ── Chart.js theme (§10.2) — call once, after Chart.js loads ──────── */
    chartTheme: function (Chart) {
      if (!Chart) return;
      Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
      Chart.defaults.font.size = 12;
      Chart.defaults.color = CS.token("--ink-2");
      Chart.defaults.borderColor = CS.token("--border");
      Chart.defaults.plugins.legend.labels.boxWidth = 12;
      Chart.defaults.plugins.tooltip.backgroundColor = CS.token("--ink");
      Chart.defaults.plugins.tooltip.titleFont = { family: "'IBM Plex Sans'", weight: "600" };
      Chart.defaults.plugins.tooltip.bodyFont = { family: "'IBM Plex Mono'" };
      return CS.categorical();
    },

    categorical: function () {
      return ["--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5", "--cat-6", "--cat-7", "--cat-8"].map(CS.token);
    },

    /* ── Sparkline (SVG, no dependency) ──────────────────────────────────
       CS.sparkline([1,2,3], {width:64, height:20, highlight:'danger'})       */
    sparkline: function (values, opts) {
      opts = opts || {};
      var w = opts.width || 64, h = opts.height || 20, pad = 2;
      var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
      var span = (max - min) || 1;
      var pts = values.map(function (v, i) {
        var x = pad + (i / (values.length - 1)) * (w - pad * 2);
        var y = h - pad - ((v - min) / span) * (h - pad * 2);
        return x.toFixed(1) + "," + y.toFixed(1);
      }).join(" ");
      var stroke = CS.token(opts.highlight === "danger" ? "--danger"
        : opts.highlight === "success" ? "--success"
        : opts.highlight === "gold" ? "--gold" : "--navy-600");
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("width", w); svg.setAttribute("height", h);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", opts.label || "Trend");
      svg.innerHTML =
        '<polyline points="' + pts + '" fill="none" stroke="' + stroke +
        '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>';
      return svg;
    },

    /* ── Desktop-first viewport gate (§5) ────────────────────────────────
       CS.requireWideViewport('This tutorial needs a wider screen. ...')      */
    requireWideViewport: function (message) {
      document.documentElement.classList.add("cs-requires-wide");
      document.body.appendChild(CS.el("div", { class: "cs-viewport-gate" }, [
        CS.el("p", { class: "cs-briefing-body", text: message })
      ]));
    }
  };

  global.CS = CS;
})(window);
