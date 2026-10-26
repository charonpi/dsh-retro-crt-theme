// dsh-retro-crt-theme — client bundle.
// Retro CRT phosphor theme (Matrix green / 40K amber-green / TFEL amber) with
// a code-rain boot animation and a BIOS-style control panel.
//
// Architecture (see DSH-CRT磷光主题-优化方案.md v3.2):
//   - palette  -> ctx.theme.overrideTokens() layer (light==dark: CRT has no daytime)
//   - halation / invert / panel chrome -> one static stylesheet, gated by
//     html[data-retro] + html[data-retro-intensity] attributes
//   - boot animation -> canvas overlay, once per browser session
//   - state -> localStorage('dsh-retro-crt-v1')
window.__ModuleLoader__.load({
  id: "dsh-retro-crt-theme",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var PLUGIN_ID = "dsh-retro-crt-theme";
    var STATE_KEY = "dsh-r…t-v1";
    var BOOT_SEEN_KEY = "dsh-r…oted";

    // ------------------------------------------------------------------
    // Palettes: 9-step ladder per phosphor. Values verified against
    // WCAG on #000 (lit >= 10:1, dim >= 6:1).
    // ------------------------------------------------------------------
    var PALETTES = {
      "crt-m": {
        lit: "#00FF41", hi: "#9DFFB4", dim: "#45D96B", mute: "#2FAE52",
        brd: "#1F7A3A", ink: "#14502A", faint: "#0A2415", deep: "#04100A",
        warn: "#D9F25E", err: "#FF7A4D",
      },
      "crt-c": {
        lit: "#D9F25E", hi: "#F0FFA8", dim: "#B8D94A", mute: "#8FA83C",
        brd: "#5C6A1E", ink: "#3A4514", faint: "#222A0C", deep: "#101505",
        warn: "#FFB454", err: "#FF7A4D",
      },
      tfel: {
        lit: "#FFA028", hi: "#FFC46A", dim: "#C77A18", mute: "#8A5310",
        brd: "#5C370A", ink: "#33200A", faint: "#1B1206", deep: "#0A0602",
        warn: "#FFC46A", err: "#FF6B5E",
      },
    };

    function mix(hex, pct, over) {
      // rgba() string of hex at pct alpha — avoids color-mix support questions
      // in token values (they land in inline styles, still fine, but rgba is
      // shorter in devtools).
      var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return "rgba(" + r + "," + g + "," + b + "," + (pct / 100) + ")";
    }

    function buildTokens(P) {
      var t = {};
      function set(name, v) { t[name] = { light: v, dark: v }; }
      // -- surfaces: pure black base, layering by glow-edge not by fill
      set("--dsw-alias-bg-base", "#000000");
      set("--dsw-alias-bg-layer-1", "#000000");
      set("--dsw-alias-bg-layer-2", P.deep);
      set("--dsw-alias-bg-layer-3", P.deep);
      set("--dsw-alias-bg-overlay", "#010101");
      set("--dsw-alias-bg-module-platform", "#000000");
      set("--dsw-alias-bg-multi-select", mix(P.lit, 10));
      set("--dsw-alias-bg-document-preview", "#010101");
      set("--dsw-alias-bg-document-selection", mix(P.lit, 28));
      set("--dsw-alias-label-document-preview", P.dim);
      set("--dsw-alias-bg-mask-1", "#000000D9");
      set("--dsw-alias-bg-mask-2", "#00000099");
      set("--dsw-alias-bg-mask-3", "#000000F2");
      set("--dsw-alias-bg-mask-photo", "#000000F5");
      set("--dsw-alias-bg-mask-drop", "#001206E6");
      set("--dsw-alias-bg-skeleton", mix(P.lit, 8));
      // -- borders: visible glow-edge ladder
      set("--dsw-alias-border-l1", P.faint);
      set("--dsw-alias-border-l2", P.ink);
      set("--dsw-alias-border-l2-darkmode-thin", P.ink);
      set("--dsw-alias-border-l3", P.brd);
      set("--dsw-alias-border-l4", P.mute);
      // -- text: luminance hierarchy == phosphor brightness hierarchy
      set("--dsw-alias-label-primary", P.lit);
      set("--dsw-alias-label-primary-dimmed", P.dim);
      set("--dsw-alias-label-primary-bluish", P.lit);
      set("--dsw-alias-label-primary-foreground", "#000000");
      set("--dsw-alias-label-primary-inverted", "#000000");
      set("--dsw-alias-label-secondary", P.dim);
      set("--dsw-alias-label-tertiary", P.mute);
      set("--dsw-alias-label-caption", P.mute);
      set("--dsw-alias-label-dimmed", P.brd);
      set("--dsw-alias-label-error", P.err);
      set("--dsw-alias-label-shimmer", mix(P.lit, 35));
      set("--dsw-alias-label-deep-diving", P.lit);
      set("--dsw-alias-label-deep-diving-shimmer", P.hi);
      // -- brand / buttons
      set("--dsw-alias-brand-primary", P.lit);
      set("--dsw-alias-brand-primary-invert", "#000000");
      set("--dsw-alias-brand-text", P.lit);
      set("--dsw-alias-brand-primary-new-colorprimary-new-color", P.lit);
      set("--dsw-alias-button-primary-fill", P.lit);
      set("--dsw-alias-button-primary-hover", P.hi);
      set("--dsw-alias-button-primary-dimmed", P.faint);
      set("--dsw-alias-button-info-fill", P.lit);
      set("--dsw-alias-button-info-hover", P.hi);
      set("--dsw-alias-button-contrast-fill", P.lit);
      set("--dsw-alias-button-elevated-fill", "#010101");
      set("--dsw-alias-button-floating-fill", P.deep);
      set("--dsw-alias-button-floating-hover", P.faint);
      set("--dsw-alias-button-ghost-active-fill", mix(P.lit, 12));
      set("--dsw-alias-button-ghost-active-hover", mix(P.lit, 18));
      set("--dsw-alias-button-ghost-active-border", P.mute);
      set("--dsw-alias-button-tool-bar-fill", mix(P.lit, 45));
      set("--dsw-alias-button-tool-bar-hover", mix(P.lit, 60));
      set("--dsw-alias-button-tool-bar-fill-invisible", mix(P.deep, 60));
      // -- interactive states
      set("--dsw-alias-interactive-bg-hover", mix(P.lit, 6));
      set("--dsw-alias-interactive-bg-hover-accent", mix(P.lit, 14));
      set("--dsw-alias-interactive-bg-active", mix(P.lit, 18));
      set("--dsw-alias-interactive-bg-hover-solid", P.faint);
      set("--dsw-alias-interactive-bg-hover-danger", mix(P.err, 8));
      set("--dsw-alias-link", P.hi);
      // -- semantic states (discipline: warn/err stay hue-shifted, success = lit)
      set("--dsw-alias-state-business-primary", P.lit);
      set("--dsw-alias-state-business-tertiary", P.faint);
      set("--dsw-alias-state-success-primary", P.lit);
      set("--dsw-alias-state-success-secondary", P.dim);
      set("--dsw-alias-state-success-tertiary", P.faint);
      set("--dsw-alias-state-warn-primary", P.warn);
      set("--dsw-alias-state-warn-secondary", P.warn);
      set("--dsw-alias-state-warn-label", P.warn);
      set("--dsw-alias-state-warn-tertiary", P.deep);
      set("--dsw-alias-state-error-primary", P.err);
      set("--dsw-alias-state-error-secondary", P.err);
      set("--dsw-alias-state-idle-primary", P.brd);
      // -- diff
      set("--dsw-alias-code-diff-added", mix(P.lit, 15));
      set("--dsw-alias-code-diff-deleted", mix(P.err, 15));
      set("--dsw-alias-file-diff-added-bg", mix(P.lit, 6));
      set("--dsw-alias-file-diff-added-gutter", mix(P.lit, 4));
      set("--dsw-alias-file-diff-added-marker", P.lit);
      set("--dsw-alias-file-diff-deleted-bg", mix(P.err, 8));
      set("--dsw-alias-file-diff-deleted-gutter", mix(P.err, 5));
      set("--dsw-alias-file-diff-deleted-marker", P.err);
      // -- markdown / code
      set("--dsw-alias-markdown-code-block", "#010101");
      set("--dsw-alias-markdown-code-block-banner", P.deep);
      set("--dsw-alias-markdown-inline-code", P.deep);
      set("--dsw-alias-markdown-tag", P.deep);
      set("--dsw-alias-markdown-citation", P.faint);
      set("--dsw-alias-markdown-placeholder", "#010101");
      set("--dsw-alias-markdown-code-segment-selected", P.lit);
      set("--dsw-alias-markdown-code-segment-unselected", P.deep);
      // -- menus / floats: opaque, no blur
      set("--dsw-alias-menu-icon", P.dim);
      set("--dsw-menu-surface-fill", "#010101F7");
      set("--dsw-alias-menu-group-header-fill", "#010101");
      set("--dsw-specific-menu", "#010101F7");
      set("--dsw-menu-backdrop-filter", "none");
      set("--dsw-alias-toast-bg", P.deep);
      set("--dsw-alias-toast-label", P.lit);
      set("--dsw-alias-tooltip-bg", P.deep);
      set("--dsw-alias-tooltip-key-bg", P.faint);
      set("--dsw-alias-turn-trigger-bg", "#010101");
      set("--dsw-alias-turn-trigger-bg-hover", mix(P.lit, 6));
      // -- scrollbars
      set("--dsw-alias-scrollbar-bg-l1", P.ink);
      set("--dsw-alias-scrollbar-bg-l2", P.ink);
      set("--dsw-alias-scrollbar-hover-l1", P.mute);
      set("--dsw-alias-scrollbar-hover-l2", P.mute);
      set("--dsh-scrollbar-width", "8px");
      // -- switch / bubbles / sidebar / misc specific
      set("--dsw-alias-switch-thumb", P.lit);
      set("--dsw-specific-bubble", P.deep);
      set("--dsw-specific-bubble-highlight", P.faint);
      set("--dsw-specific-input-major", "#010101");
      set("--dsw-specific-login-input", "#010101");
      set("--dsw-specific-selector", P.deep);
      set("--dsw-specific-sidebar-fill", "#000000");
      set("--dsw-specific-sidebar-nav-item-active", mix(P.lit, 12));
      set("--dsw-specific-sidebar-nav-item-active-accent", P.lit);
      set("--dsw-specific-sidebar-nav-item-hover", mix(P.lit, 6));
      set("--dsw-specific-tip", P.deep);
      // -- geometry: no radii, hairline -> hard 1px, shadows -> light bleed
      set("--dsw-radius-xs", "0px");
      set("--dsw-radius-sm", "0px");
      set("--dsw-radius-md", "0px");
      set("--dsw-radius-lg", "0px");
      set("--dsw-radius-xl", "0px");
      set("--dsw-radius-panel", "0px");
      set("--dsw-elevation-stroke-color", P.ink);
      // -- shiki syntax: 5 luminance steps of one hue
      set("--shiki-foreground", P.lit);
      set("--shiki-background", "#010101");
      set("--shiki-token-comment", P.brd);
      set("--shiki-token-punctuation", P.mute);
      set("--shiki-token-string", P.dim);
      set("--shiki-token-string-expression", P.dim);
      set("--shiki-token-constant", P.lit);
      set("--shiki-token-parameter", P.lit);
      set("--shiki-token-keyword", P.hi);
      set("--shiki-token-function", P.hi);
      set("--shiki-token-link", P.hi);
      return t;
    }

    // ------------------------------------------------------------------
    // Structure stylesheet (injected once; gated by html[data-retro*])
    // ------------------------------------------------------------------
    var STRUCTURE_CSS = [
      // phosphor vars for chrome we draw ourselves (panel, boot, overlays).
      // Base defaults on plain `html` so the control panel stays readable
      // even in OFF mode; the per-screen rules below override them.
      'html{--retro-lit:#00FF41;--retro-hi:#9DFFB4;--retro-dim:#45D96B;--retro-mute:#2FAE52;--retro-brd:#1F7A3A;--retro-ink:#14502A;--retro-faint:#0A2415;--retro-deep:#04100A}',
      'html[data-retro="crt-m"]{--retro-lit:#00FF41;--retro-hi:#9DFFB4;--retro-dim:#45D96B;--retro-mute:#2FAE52;--retro-brd:#1F7A3A;--retro-ink:#14502A;--retro-faint:#0A2415;--retro-deep:#04100A}',
      'html[data-retro="crt-c"]{--retro-lit:#D9F25E;--retro-hi:#F0FFA8;--retro-dim:#B8D94A;--retro-mute:#8FA83C;--retro-brd:#5C6A1E;--retro-ink:#3A4514;--retro-faint:#222A0C;--retro-deep:#101505}',
      'html[data-retro="tfel"]{--retro-lit:#FFA028;--retro-hi:#FFC46A;--retro-dim:#C77A18;--retro-mute:#8A5310;--retro-brd:#5C370A;--retro-ink:#33200A;--retro-faint:#1B1206;--retro-deep:#0A0602}',
      // Static color-family fallback. design-platform.css declares these on
      // `body`, so an `html`-only override is clobbered at body and below —
      // target `html[data-retro] body` (0,2,1 beats 0,0,1). A handful of
      // component rules and onboarding.css reference statics directly;
      // without this they leak white / brand-blue patches.
      'html[data-retro^="crt"] body{--dsw-static-neutral-00:#010101;--dsw-static-neutral-50:#010101;--dsw-static-neutral-100:#04100A;--dsw-static-neutral-150:#0A2415;--dsw-static-neutral-200:#14502A;--dsw-static-neutral-250:#1F7A3A;--dsw-static-neutral-300:#2FAE52;--dsw-static-neutral-400:#45D96B;--dsw-static-neutral-500:#45D96B;--dsw-static-neutral-550:#2FAE52;--dsw-static-neutral-600:#2FAE52;--dsw-static-neutral-700:#45D96B;--dsw-static-neutral-800:#04100A;--dsw-static-neutral-850:#0A2415;--dsw-static-neutral-900:#010101;--dsw-static-neutral-1000:#000000;--dsw-static-neutral-bluish-00:#010101;--dsw-static-neutral-bluish-50:#010101;--dsw-static-neutral-bluish-60:#010101;--dsw-static-neutral-bluish-75:#04100A;--dsw-static-neutral-bluish-100:#0A2415;--dsw-static-neutral-bluish-150:#14502A;--dsw-static-neutral-bluish-200:#1F7A3A;--dsw-static-neutral-bluish-300:#2FAE52;--dsw-static-neutral-bluish-400:#45D96B;--dsw-static-neutral-bluish-500:#45D96B;--dsw-static-neutral-bluish-600:#2FAE52;--dsw-static-neutral-bluish-700:#45D96B;--dsw-static-neutral-bluish-750:#9DFFB4;--dsw-static-neutral-bluish-800:#04100A;--dsw-static-neutral-bluish-850:#0A2415;--dsw-static-neutral-bluish-875:#04100A;--dsw-static-neutral-bluish-900:#010101;--dsw-static-neutral-bluish-950:#000000;--dsw-static-neutral-bluish-1000:#000000}',
      'html[data-retro^="crt"] body{--dsw-static-blue-50:#04100A;--dsw-static-blue-75:#0A2415;--dsw-static-blue-100:#14502A;--dsw-static-blue-300:#45D96B;--dsw-static-blue-400:#9DFFB4;--dsw-static-blue-450:#00FF41;--dsw-static-blue-500:#00FF41;--dsw-static-blue-50p:#04100A;--dsw-static-blue-600:#45D96B;--dsw-static-blue-800:#1F7A3A;--dsw-static-blue-900:#14502A;--dsw-static-blue-950:#04100A;--dsw-static-deepseek-50:#04100A;--dsw-static-deepseek-100:#0A2415;--dsw-static-deepseek-200:#14502A;--dsw-static-deepseek-300:#1F7A3A;--dsw-static-deepseek-400:#9DFFB4;--dsw-static-deepseek-450:#00FF41;--dsw-static-deepseek-500:#00FF41;--dsw-static-deepseek-600:#45D96B;--dsw-static-deepseek-700-delete:#1F7A3A;--dsw-static-deepseek-800:#14502A;--dsw-static-deepseek-900:#0A2415}',
      'html[data-retro^="crt"] body{--dsw-static-green-50:#04100A;--dsw-static-green-100:#0A2415;--dsw-static-green-400:#45D96B;--dsw-static-green-500:#00FF41;--dsw-static-green-500-a08:rgba(0,255,65,.08);--dsw-static-green-500-a12:rgba(0,255,65,.12);--dsw-static-green-900:#14502A;--dsw-static-red-50:#140503;--dsw-static-red-100:#2A0A06;--dsw-static-red-400:#FF9A85;--dsw-static-red-400-a12:rgba(255,122,77,.12);--dsw-static-red-500:#FF7A4D;--dsw-static-red-600:#FF7A4D;--dsw-static-red-600-a08:rgba(255,122,77,.08);--dsw-static-red-900:#2A0A06;--dsw-static-amber-50:#101505;--dsw-static-amber-100:#222A0C;--dsw-static-amber-400:#D9F25E;--dsw-static-amber-500:#D9F25E;--dsw-static-amber-600:#8FA83C;--dsw-static-amber-900:#222A0C}',
      'html[data-retro="crt-c"] body{--dsw-static-blue-450:#D9F25E;--dsw-static-blue-500:#D9F25E;--dsw-static-blue-400:#F0FFA8;--dsw-static-blue-300:#B8D94A;--dsw-static-deepseek-450:#D9F25E;--dsw-static-deepseek-500:#D9F25E;--dsw-static-deepseek-400:#F0FFA8;--dsw-static-green-500:#D9F25E;--dsw-static-green-400:#B8D94A;--dsw-static-neutral-bluish-750:#F0FFA8}',
      'html[data-retro="tfel"] body{--dsw-static-neutral-00:#010101;--dsw-static-neutral-50:#010101;--dsw-static-neutral-100:#0A0602;--dsw-static-neutral-150:#1B1206;--dsw-static-neutral-200:#33200A;--dsw-static-neutral-250:#5C370A;--dsw-static-neutral-300:#8A5310;--dsw-static-neutral-400:#C77A18;--dsw-static-neutral-500:#C77A18;--dsw-static-neutral-600:#8A5310;--dsw-static-neutral-700:#C77A18;--dsw-static-neutral-800:#0A0602;--dsw-static-neutral-850:#1B1206;--dsw-static-neutral-900:#010101;--dsw-static-neutral-1000:#000000;--dsw-static-neutral-bluish-00:#010101;--dsw-static-neutral-bluish-50:#010101;--dsw-static-neutral-bluish-60:#010101;--dsw-static-neutral-bluish-75:#0A0602;--dsw-static-neutral-bluish-100:#1B1206;--dsw-static-neutral-bluish-150:#33200A;--dsw-static-neutral-bluish-200:#5C370A;--dsw-static-neutral-bluish-300:#8A5310;--dsw-static-neutral-bluish-400:#C77A18;--dsw-static-neutral-bluish-500:#C77A18;--dsw-static-neutral-bluish-600:#8A5310;--dsw-static-neutral-bluish-700:#C77A18;--dsw-static-neutral-bluish-750:#FFC46A;--dsw-static-neutral-bluish-800:#0A0602;--dsw-static-neutral-bluish-850:#1B1206;--dsw-static-neutral-bluish-875:#0A0602;--dsw-static-neutral-bluish-900:#010101;--dsw-static-neutral-bluish-950:#000000;--dsw-static-neutral-bluish-1000:#000000;--dsw-static-blue-450:#FFA028;--dsw-static-blue-500:#FFA028;--dsw-static-deepseek-450:#FFA028;--dsw-static-deepseek-500:#FFA028;--dsw-static-green-500:#FFA028;--dsw-static-red-500:#FF6B5E;--dsw-static-red-600:#FF6B5E}',
      // halation: double solid core fattens the glyph, outer layers bloom.
      // currentColor keeps the luminance hierarchy automatic.
      'html[data-retro^="crt"] body{font-weight:400;text-shadow:0 0 1px currentColor,0 0 2px currentColor,0 0 8px color-mix(in srgb,currentColor 70%,transparent),0 0 22px color-mix(in srgb,currentColor 35%,transparent),0 0 46px color-mix(in srgb,currentColor 18%,transparent)}',
      'html[data-retro="tfel"] body{text-shadow:0 0 1px currentColor,0 0 6px color-mix(in srgb,currentColor 55%,transparent),0 0 14px color-mix(in srgb,currentColor 25%,transparent)}',
      'html[data-retro][data-retro-intensity="low"] body{text-shadow:0 0 1px currentColor,0 0 6px color-mix(in srgb,currentColor 45%,transparent)}',
      // pixel-font option: monospace everywhere (bold feel comes from cores)
      'html[data-retro][data-retro-pix="1"] body,html[data-retro][data-retro-pix="1"] body input,html[data-retro][data-retro-pix="1"] body textarea,html[data-retro][data-retro-pix="1"] body button,html[data-retro][data-retro-pix="1"] body select{font-family:Consolas,"Sarasa Mono SC","Courier New",monospace}',
      // caret + selection: lit block energy
      'html[data-retro] body{caret-color:var(--retro-lit)}',
      'html[data-retro] ::selection{background:var(--retro-lit);color:#000;text-shadow:none}',
      // elevation: shadows are light bleed, not black smudge. body,body* re-declares
      // per element, so beat it with html body / html body *.
      'html[data-retro] body,html[data-retro] body *{--dsw-elevation-stroke:0 0 0 1px var(--retro-ink)}',
      'html[data-retro] body,html[data-retro] body *{--dsw-elevation-panel:0 0 0 1px var(--retro-ink),0 0 14px color-mix(in srgb,var(--retro-lit) 10%,transparent)}',
      'html[data-retro] body,html[data-retro] body *{--dsw-elevation-prominent:0 0 0 1px var(--retro-brd),0 0 20px color-mix(in srgb,var(--retro-lit) 14%,transparent)}',
      'html[data-retro] body,html[data-retro] body *{--dsw-elevation-soft:0 0 0 1px var(--retro-ink),0 0 18px color-mix(in srgb,var(--retro-lit) 8%,transparent)}',
      // square scrollbar thumb (scrollbar.css hard-codes 999px)
      'html[data-retro] ::-webkit-scrollbar-thumb{border-radius:0!important}',
      // heavy-only atmosphere (JS mounts the divs)
      '.rcrt-sweep{position:fixed;left:0;right:0;top:-30%;height:26%;z-index:2147483000;pointer-events:none;background:linear-gradient(180deg,#0000,rgba(180,255,190,.035),#0000);animation:rcrt-sweep 7.5s linear infinite}',
      '@keyframes rcrt-sweep{to{transform:translateY(540%)}}',
      '.rcrt-flick{position:fixed;inset:0;z-index:2147483001;pointer-events:none;background:#000;opacity:0;animation:rcrt-flick 5s steps(1) infinite}',
      '@keyframes rcrt-flick{0%,91%,94%,100%{opacity:0}92%{opacity:.05}93%{opacity:.02}}',
      '.rcrt-vig{position:fixed;inset:0;z-index:2147482999;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,#0000 58%,rgba(0,0,0,.55) 100%)}',
      // TFEL dot-matrix film (heavy only)
      '.rcrt-film{position:fixed;inset:0;z-index:2147482998;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 2px,rgba(0,0,0,.10) 2px 3px),repeating-linear-gradient(90deg,#0000 0 2px,rgba(0,0,0,.05) 2px 3px)}',
      "@media (prefers-reduced-motion: reduce){.rcrt-sweep,.rcrt-flick{animation:none;display:none}}",
      // ---- control panel (BIOS chrome) ----
      '.rcrt-fab{position:fixed;right:14px;bottom:14px;z-index:2147483100;display:flex;align-items:center;gap:7px;border:1px solid var(--retro-brd);background:#000;color:var(--retro-lit);font:700 10px/1 Consolas,monospace;letter-spacing:.18em;padding:8px 11px;cursor:pointer;text-shadow:0 0 1px var(--retro-lit),0 0 8px color-mix(in srgb,var(--retro-lit) 50%,transparent)}',
      '.rcrt-fab:hover{box-shadow:0 0 12px color-mix(in srgb,var(--retro-lit) 30%,transparent)}',
      '.rcrt-fab .led{width:6px;height:6px;background:var(--retro-lit);box-shadow:0 0 6px var(--retro-lit)}',
      '.rcrt-fab.off{color:var(--retro-mute);text-shadow:none}.rcrt-fab.off .led{background:var(--retro-ink);box-shadow:none}',
      '.rcrt-panel{position:fixed;right:14px;bottom:52px;z-index:2147483101;width:264px;border:1px solid var(--retro-brd);background:#000;color:var(--retro-lit);font:11px/1.5 Consolas,monospace;box-shadow:0 0 24px color-mix(in srgb,var(--retro-lit) 12%,transparent)}',
      '.rcrt-panel .ph{display:flex;justify-content:space-between;padding:7px 10px;border-bottom:1px solid var(--retro-ink);font-size:9px;letter-spacing:.2em;color:var(--retro-dim)}',
      '.rcrt-panel .sec{padding:9px 10px 11px;border-bottom:1px solid var(--retro-faint)}',
      '.rcrt-panel .lab{font-size:8px;letter-spacing:.22em;color:var(--retro-mute);margin-bottom:6px}',
      '.rcrt-seg{display:flex;gap:4px;flex-wrap:wrap}',
      '.rcrt-seg button{flex:1;border:1px solid var(--retro-ink);background:#000;color:var(--retro-mute);font:inherit;font-size:9px;letter-spacing:.1em;padding:5px 4px;cursor:pointer;min-width:52px}',
      '.rcrt-seg button:hover{border-color:var(--retro-brd);color:var(--retro-dim)}',
      '.rcrt-seg button.on{background:var(--retro-lit);color:#000;font-weight:700;border-color:var(--retro-lit);box-shadow:0 0 10px color-mix(in srgb,var(--retro-lit) 45%,transparent)}',
      '.rcrt-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;color:var(--retro-dim)}',
      '.rcrt-sw{width:34px;height:16px;border:1px solid var(--retro-brd);position:relative;cursor:pointer;background:#000}',
      '.rcrt-sw i{position:absolute;top:2px;left:2px;width:12px;height:10px;background:var(--retro-mute);transition:left .12s steps(2)}',
      '.rcrt-sw.on{border-color:var(--retro-lit)}.rcrt-sw.on i{left:18px;background:var(--retro-lit);box-shadow:0 0 6px var(--retro-lit)}',
      '.rcrt-btn{border:1px solid var(--retro-ink);background:#000;color:var(--retro-dim);font:inherit;font-size:9px;letter-spacing:.14em;padding:6px 8px;cursor:pointer;width:100%}',
      '.rcrt-btn:hover{border-color:var(--retro-lit);color:var(--retro-lit)}',
      // ---- boot overlay ----
      '.rcrt-boot{position:fixed;inset:0;z-index:2147483200;background:#000;display:grid;place-items:center;transition:opacity .8s linear}',
      '.rcrt-boot canvas{position:absolute;inset:0;width:100%;height:100%;transition:opacity 1s linear}',
      '.rcrt-boot .hud{position:absolute;top:14px;left:16px;font:9px/1 Consolas,monospace;letter-spacing:.2em;color:var(--retro-brd)}',
      '.rcrt-boot .skip{position:absolute;bottom:14px;right:16px;font:9px/1 Consolas,monospace;letter-spacing:.18em;color:var(--retro-brd);opacity:0;transition:opacity .6s}',
      '.rcrt-boot .skip.show{opacity:1}',
      '.rcrt-boot .stage{position:relative;z-index:2;text-align:center;padding:0 24px}',
      '.rcrt-boot .stage::before{content:"";position:absolute;inset:-46px -70px;z-index:-1;background:radial-gradient(ellipse at center,rgba(0,0,0,.88) 0%,rgba(0,0,0,.62) 45%,#0000 78%)}',
      '.rcrt-boot .wake{height:20px;font:700 14px/1 Consolas,monospace;letter-spacing:.12em;color:var(--retro-dim);margin-bottom:26px;transition:opacity .5s}',
      '.rcrt-boot .wake .caret{display:inline-block;width:9px;height:14px;background:var(--retro-lit);vertical-align:-2px;box-shadow:0 0 8px var(--retro-lit);animation:rcrt-blink 1s steps(1) infinite}',
      '@keyframes rcrt-blink{50%{opacity:0}}',
      '.rcrt-boot .title{font-size:clamp(30px,5.2vw,58px);font-weight:700;letter-spacing:.04em;white-space:nowrap;font-family:Consolas,"Courier New",monospace}',
      '.rcrt-boot .title span{display:inline-block;min-width:.62em}',
      '.rcrt-boot .title .scram{color:var(--retro-brd);text-shadow:none}',
      '.rcrt-boot .title .sp{min-width:.35em}',
      '.rcrt-boot .sub{margin-top:18px;font:12px/1 Consolas,monospace;color:var(--retro-dim);opacity:0;letter-spacing:.16em;transition:opacity .9s linear,letter-spacing .9s ease-out}',
      '.rcrt-boot .sub.show{opacity:1;letter-spacing:.46em}',
    ].join("\n");

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    function loadState() {
      var s = { screen: "crt-m", intensity: "mid", pix: 0, boot: 1 };
      try {
        var raw = localStorage.getItem(STATE_KEY);
        if (raw) Object.assign(s, JSON.parse(raw));
      } catch (e) { /* fall back to defaults */ }
      if (!PALETTES[s.screen] && s.screen !== "off") s.screen = "crt-m";
      return s;
    }
    function saveState(s) {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
    }

    // ------------------------------------------------------------------
    // Boot animation (ported from DSH-CRT开机动画.html)
    // ------------------------------------------------------------------
    var GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
    var TITLE_TEXT = "DeepSeek Harness";
    var WAKE_TEXT = "wake up...";

    function playBoot(P, onDone) {
      if (typeof document === "undefined") return;
      if (sessionStorage.getItem(BOOT_SEEN_KEY)) { if (onDone) onDone(); return; }
      try { sessionStorage.setItem(BOOT_SEEN_KEY, "1"); } catch (e) { /* ignore */ }

      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var boot = document.createElement("div");
      boot.className = "rcrt-boot";
      boot.innerHTML = '<canvas></canvas><div class="hud">DSH//CRT · BOOT SEQUENCE · PHOSPHOR</div>' +
        '<div class="stage"><div class="wake"></div><div class="title"></div><div class="sub">IS IT A DREAM OR NOT</div></div>' +
        '<div class="skip">PRESS ANY KEY TO SKIP</div>';
      document.body.appendChild(boot);
      var canvas = boot.querySelector("canvas");
      var wakeEl = boot.querySelector(".wake");
      var titleEl = boot.querySelector(".title");
      var subEl = boot.querySelector(".sub");
      var ctx2d = canvas.getContext("2d");

      var FS = 16, drops = [], speed = [], rainTimer = null, timers = [], finished = false;
      function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
      function cleanup() {
        timers.forEach(clearTimeout); timers = [];
        if (rainTimer) clearInterval(rainTimer);
        window.removeEventListener("keydown", skip);
        window.removeEventListener("pointerdown", skip);
      }
      function rand() { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }

      function sizeCanvas() {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        var cols = Math.ceil(canvas.width / FS);
        drops.length = 0; speed.length = 0;
        for (var i = 0; i < cols; i++) { drops.push(-Math.random() * 10); speed.push(0.35 + Math.random() * 0.85); }
        ctx2d.fillStyle = "#000"; ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        for (var k = 0; k < 40; k++) rainStep();
      }
      function rainStep() {
        ctx2d.fillStyle = "rgba(0,0,0,0.055)";
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        ctx2d.font = "700 " + FS + "px Consolas,monospace";
        for (var i = 0; i < drops.length; i++) {
          var x = i * FS, y = Math.floor(drops[i]) * FS;
          if (y > 0 && y < canvas.height + FS) {
            ctx2d.fillStyle = "rgba(214,255,224,0.95)"; ctx2d.fillText(rand(), x, y);
            ctx2d.fillStyle = P.lit + "D9"; ctx2d.fillText(rand(), x, y - FS);
          }
          drops[i] += speed[i];
          if (drops[i] * FS > canvas.height + FS * 2) { drops[i] = -Math.random() * 8; speed[i] = 0.35 + Math.random() * 0.85; }
        }
      }
      function typeWake(i) {
        if (finished || i > WAKE_TEXT.length) return;
        wakeEl.innerHTML = WAKE_TEXT.slice(0, i) + '<span class="caret"></span>';
        at(75, function () { typeWake(i + 1); });
      }
      function decodeTitle() {
        var spans = [], settle = [], now0 = performance.now();
        for (var i = 0; i < TITLE_TEXT.length; i++) {
          var s = document.createElement("span"), ch = TITLE_TEXT[i];
          if (ch === " ") { s.className = "sp"; s.innerHTML = "&nbsp;"; titleEl.appendChild(s); spans.push(s); settle.push(Infinity); continue; }
          s.className = "scram"; s.textContent = rand(); titleEl.appendChild(s);
          spans.push(s); settle.push(now0 + 350 + i * 62 + Math.random() * 260);
        }
        (function tick() {
          if (finished) return;
          var n = performance.now(), done = 0;
          for (var i = 0; i < spans.length; i++) {
            if (settle[i] === Infinity) { done++; continue; }
            if (n >= settle[i]) {
              if (!spans[i].classList.contains("lit")) {
                spans[i].className = "lit"; spans[i].textContent = TITLE_TEXT[i];
                spans[i].style.textShadow = "0 0 1px " + P.lit + ",0 0 2px " + P.lit +
                  ",0 0 8px " + P.lit + "BF,0 0 22px " + P.lit + "73,0 0 46px " + P.lit + "38";
              }
              done++;
            } else spans[i].textContent = rand();
          }
          if (done < spans.length) requestAnimationFrame(tick);
        })();
      }
      function finish() {
        if (finished) return; finished = true;
        cleanup();
        canvas.style.opacity = "0"; wakeEl.style.opacity = "0"; boot.style.opacity = "0";
        setTimeout(function () { boot.remove(); if (onDone) onDone(); }, 850);
      }
      function skip() { if (!finished) finish(); }

      boot.querySelector(".skip").classList.add("show");
      window.addEventListener("keydown", skip);
      window.addEventListener("pointerdown", skip);
      window.addEventListener("resize", sizeCanvas);
      sizeCanvas();
      if (reduce) {
        titleEl.innerHTML = '<span class="lit" style="color:' + P.lit + '">' + TITLE_TEXT.replace(/ /g, "</span>&nbsp;<span>") + "</span>";
        subEl.classList.add("show");
        at(1600, finish);
        return;
      }
      rainTimer = setInterval(rainStep, 33);
      at(400, function () { typeWake(0); });
      at(1500, function () { wakeEl.style.opacity = "0"; });
      at(1750, decodeTitle);
      at(3200, function () { subEl.classList.add("show"); });
      at(4900, function () { canvas.style.opacity = ".12"; });
      at(5500, finish);
    }

    // ------------------------------------------------------------------
    // Control panel
    // ------------------------------------------------------------------
    function buildPanel(getState, setState, replayBoot) {
      var SCREENS = [["off", "OFF"], ["tfel", "TFEL"], ["crt-m", "CRT·M"], ["crt-c", "CRT·C"]];
      var LEVELS = [["low", "LOW"], ["mid", "MID"], ["heavy", "MAX"]];
      var fab = document.createElement("button");
      fab.className = "rcrt-fab";
      fab.innerHTML = '<span class="led"></span><span>CRT</span>';
      var panel = document.createElement("div");
      panel.className = "rcrt-panel";
      panel.style.display = "none";
      panel.innerHTML =
        '<div class="ph"><span>DISPLAY SETUP</span><span>ESC EXIT</span></div>' +
        '<div class="sec"><div class="lab">SCREEN TYPE</div><div class="rcrt-seg" data-k="screen"></div></div>' +
        '<div class="sec"><div class="lab">HALATION</div><div class="rcrt-seg" data-k="intensity"></div></div>' +
        '<div class="sec">' +
        '<div class="rcrt-row"><span>MONO FONT</span><span class="rcrt-sw" data-k="pix"><i></i></span></div>' +
        '<div class="rcrt-row"><span>BOOT ANIM</span><span class="rcrt-sw" data-k="boot"><i></i></span></div>' +
        '</div>' +
        '<div class="sec"><button class="rcrt-btn" data-a="replay">▶ REPLAY BOOT SEQUENCE</button></div>';
      document.body.appendChild(fab);
      document.body.appendChild(panel);

      function segRows() {
        var s = getState();
        panel.querySelectorAll(".rcrt-seg").forEach(function (row) {
          var k = row.dataset.k, opts = k === "screen" ? SCREENS : LEVELS;
          row.innerHTML = "";
          opts.forEach(function (o) {
            var b = document.createElement("button");
            b.textContent = o[1];
            if (s[k] === o[0]) b.className = "on";
            b.addEventListener("click", function () { setState(Object.assign({}, getState(), (function () { var x = {}; x[k] = o[0]; return x; })())); });
            row.appendChild(b);
          });
        });
        panel.querySelectorAll(".rcrt-sw").forEach(function (sw) {
          var k = sw.dataset.k;
          sw.classList.toggle("on", !!getState()[k]);
          sw.onclick = function () { var n = Object.assign({}, getState()); n[k] = n[k] ? 0 : 1; setState(n); };
        });
        fab.classList.toggle("off", s.screen === "off");
      }
      fab.addEventListener("click", function (e) {
        e.stopPropagation();
        panel.style.display = panel.style.display === "none" ? "block" : "none";
        segRows();
      });
      panel.querySelector('[data-a="replay"]').addEventListener("click", function (e) {
        e.stopPropagation();
        try { sessionStorage.removeItem(BOOT_SEEN_KEY); } catch (err) { /* ignore */ }
        panel.style.display = "none";
        replayBoot();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && panel.style.display !== "none") panel.style.display = "none";
      });
      return { sync: segRows, remove: function () { fab.remove(); panel.remove(); } };
    }

    // ------------------------------------------------------------------
    // apply()
    // ------------------------------------------------------------------
    function apply(ctx) {
      if (typeof document === "undefined") return;
      // structure stylesheet
      ctx.effect(function () {
        var tag = document.createElement("style");
        tag.dataset.plugin = PLUGIN_ID;
        tag.textContent = STRUCTURE_CSS;
        document.head.appendChild(tag);
        return function () { tag.remove(); };
      }, "retro-crt: structure css");

      var state = loadState();
      var tokenDisposer = null;
      var overlays = [];

      function mountOverlays() {
        overlays.forEach(function (o) { o.remove(); }); overlays = [];
        if (state.screen === "off" || state.intensity !== "heavy") return;
        function mk(cls) { var d = document.createElement("div"); d.className = cls; document.body.appendChild(d); overlays.push(d); }
        if (state.screen === "tfel") { mk("rcrt-film"); return; }
        mk("rcrt-vig"); mk("rcrt-sweep"); mk("rcrt-flick");
      }
      function applyState() {
        if (tokenDisposer) { tokenDisposer(); tokenDisposer = null; }
        var root = document.documentElement;
        if (state.screen === "off") {
          root.removeAttribute("data-retro");
          root.removeAttribute("data-retro-intensity");
          root.removeAttribute("data-retro-pix");
        } else {
          root.setAttribute("data-retro", state.screen);
          root.setAttribute("data-retro-intensity", state.intensity);
          root.setAttribute("data-retro-pix", state.pix ? "1" : "0");
          tokenDisposer = ctx.theme.overrideTokens(PLUGIN_ID, buildTokens(PALETTES[state.screen]));
        }
        mountOverlays();
      }
      function setState(next) {
        var replay = state.screen !== next.screen && next.boot && next.screen !== "off";
        state = next; saveState(state); applyState(); if (panel) panel.sync();
        if (replay) { try { sessionStorage.removeItem(BOOT_SEEN_KEY); } catch (e) { /* ignore */ } playBoot(PALETTES[state.screen]); }
      }
      applyState();
      var panel = buildPanel(function () { return state; }, setState, function () {
        playBoot(PALETTES[state.screen] || PALETTES["crt-m"]);
      });
      if (state.screen !== "off" && state.boot) {
        setTimeout(function () { playBoot(PALETTES[state.screen]); }, 300);
      }
      ctx.effect(function () {
        return function () {
          if (tokenDisposer) tokenDisposer();
          overlays.forEach(function (o) { o.remove(); });
          panel.remove();
          var root = document.documentElement;
          root.removeAttribute("data-retro"); root.removeAttribute("data-retro-intensity"); root.removeAttribute("data-retro-pix");
        };
      }, "retro-crt: teardown");
    }

    exports.apply = apply;
    exports.inject = ["theme"];
    return module.exports;
  },
});
