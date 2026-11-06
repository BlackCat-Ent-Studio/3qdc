// admin-shell-css.mjs — the look of the editor pages' frame (side bar, top bar, game switcher) and of the overview, plus the
// palette they share. Class names carry the prefix sh- (frame) or ov- (overview) because the older screens inside the frame
// still use plain names (.btn, .tab, .pill, ...) from news-theme.mjs / admin-page.mjs.
// Light is the default; html[data-theme="dark"] switches. Colours, sizes and spacing follow the approved mock-up (tokens.css).
// The older screens read the news palette (--ink, --panel, --gold ...): inside the frame those names are pointed at the new
// palette so they sit in it without being redrawn yet.
export const SHELL_CSS = `
:root,html[data-theme="light"]{
  --font-sans:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif;--font-mono:"JetBrains Mono",ui-monospace,Consolas,monospace;
  --text-xs:12px;--text-sm:13px;--text-md:14px;--text-lg:16px;--text-xl:20px;--text-2xl:24px;
  --s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:20px;--s6:24px;--s8:32px;--s10:40px;
  --radius-sm:4px;--radius:6px;--radius-lg:10px;
  --bg:#fafaf9;--surface:#ffffff;--surface-2:#f4f4f2;--surface-hover:#f0f0ed;--border:#e7e6e3;--border-strong:#d6d4cf;
  --tx:#1c1c1a;--tx-2:#57564f;--tx-3:#8a8880;
  --accent:#2f5bd3;--accent-hover:#2a50bb;--accent-soft:#eaf0fd;--accent-ink:#ffffff;
  --ok-bg:#e8f3ea;--ok:#2f6b3a;--warn-bg:#fbf1d9;--warn:#8a5a00;--danger-bg:#fdeceb;--danger:#a8322d;--info-bg:#e6f1fa;--info:#1f5f8f;
  --game-3qdc:#b4542a;--game-skystory:#2b7fb8;--game-thu:#6b6a63;
  --shadow-pop:0 8px 24px rgba(20,20,18,.10),0 1px 3px rgba(20,20,18,.08);
  --focus:0 0 0 2px var(--surface),0 0 0 4px var(--accent);--ease:cubic-bezier(.16,1,.3,1);--adm-h:56px;--side-w:236px}
html[data-theme="dark"]{
  --bg:#121211;--surface:#1a1a19;--surface-2:#222220;--surface-hover:#262624;--border:#2e2e2b;--border-strong:#3c3b37;
  --tx:#ecebe7;--tx-2:#b0aea6;--tx-3:#85837b;
  --accent:#6c8ff0;--accent-hover:#86a3f3;--accent-soft:#1e2840;--accent-ink:#0f1424;
  --ok-bg:#1b2b1e;--ok:#8cc79a;--warn-bg:#2e2513;--warn:#e3b55c;--danger-bg:#331b1a;--danger:#ef8f88;--info-bg:#172634;--info:#8cc0e8;
  --shadow-pop:0 8px 24px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.4)}

/* the frame is on screen when #app holds a side bar; the older screens inside it read the news palette, pointed here at the new one */
#app:has(>.sh-side){
  --ink:var(--bg);--ink-2:var(--surface-2);--panel:var(--surface);--panel-2:var(--surface-2);
  --line:var(--border);--line-soft:var(--border);
  --gold:var(--accent);--gold-hi:var(--accent);--ember:var(--accent);--ember-dk:var(--accent-hover);
  --text:var(--tx);--muted:var(--tx-2);--faint:var(--tx-3);--text-2:var(--tx-2);--nav:var(--tx-2);--prose:var(--tx);--strong:var(--tx);
  --tint:var(--accent-soft);--tint-row:var(--surface-hover);--tint-th:var(--accent-soft);--on-gold:var(--accent-ink);
  --display:var(--font-sans);--body:var(--font-sans);--draft:var(--tx-3);--review:var(--info);
  color:var(--tx);font-family:var(--font-sans)}
html:has(#app>.sh-side),html:has(#app>.sh-side) body{background:var(--bg)}
#app:has(>.sh-side) .btn-fire{background:var(--accent);color:var(--accent-ink)}
#app:has(>.sh-side) .btn-fire:hover{background:var(--accent-hover);filter:none}
#app:has(>.sh-side) .tab.on{background:var(--accent);color:var(--accent-ink)}
#app:has(>.sh-side) .tab.on small{color:var(--accent-ink);opacity:.8}
#app:has(>.sh-side) main.wrap{max-width:1480px;margin:0 0 0 var(--side-w);padding:calc(var(--adm-h) + var(--s6)) var(--s8) 96px}
#app:has(>.sh-side) .adm-top{padding-block:0 var(--s5)}
#app:has(>.sh-side) .adm-top h1{font-family:var(--font-sans);font-size:var(--text-2xl);font-weight:600;letter-spacing:-.015em;line-height:1.2;color:var(--tx)}
#app:has(>.sh-side) .adm-top p{max-width:72ch}

.sh-ic{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.sh-side{position:fixed;left:0;top:0;bottom:0;width:var(--side-w);z-index:30;background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;color:var(--tx)}
.sh-brand{height:var(--adm-h);flex:none;display:flex;align-items:center;gap:var(--s3);padding:0 var(--s4);border-bottom:1px solid var(--border)}
.sh-mark{width:28px;height:28px;border-radius:var(--radius);background:var(--tx);color:var(--surface);display:grid;place-items:center;font-weight:700;font-size:var(--text-sm)}
.sh-brand b{display:block;font-size:var(--text-md);font-weight:600;line-height:1.2}
.sh-brand small{display:block;font-size:var(--text-xs);color:var(--tx-3);line-height:1.2}
.sh-nav{padding:var(--s3) var(--s2);flex:1}
.sh-label{display:flex;align-items:center;gap:var(--s2);margin:var(--s4) var(--s2) var(--s1);font-size:var(--text-xs);font-weight:500;color:var(--tx-3)}
.sh-label:first-child{margin-top:var(--s1)}
.sh-nv{display:flex;align-items:center;gap:10px;width:100%;min-height:34px;padding:6px var(--s2);border:0;border-radius:var(--radius);background:none;text-align:left;font-size:var(--text-md);color:var(--tx-2);text-decoration:none;transition:background .12s var(--ease),color .12s}
.sh-nv:hover{background:var(--surface-hover);color:var(--tx)}
.sh-nv[aria-current="page"]{background:var(--surface-2);color:var(--tx);font-weight:600}
.sh-cnt{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--warn-bg);color:var(--warn);font-size:var(--text-xs);font-weight:600;display:grid;place-items:center}
.sh-sub{margin:2px 0 var(--s2) 19px;padding-left:var(--s3);border-left:1px solid var(--border)}
.sh-sub .sh-nv{min-height:30px;font-size:var(--text-sm)}
.sh-nv.sh-dim{color:var(--tx-3);cursor:default}
.sh-nv.sh-dim:hover{background:none;color:var(--tx-3)}
.sh-foot{padding:var(--s3) var(--s4);border-top:1px solid var(--border);font-size:var(--text-xs)}
.sh-foot a{color:var(--tx-2);text-decoration:none}
.sh-foot a:hover{color:var(--tx);text-decoration:underline;text-underline-offset:3px}
.sh-tile{flex:none;display:grid;place-items:center;border-radius:6px;color:#fff;font-weight:700;letter-spacing:-.02em;line-height:1;object-fit:cover}

.sh-top{position:fixed;top:0;left:var(--side-w);right:0;height:var(--adm-h);z-index:20;display:flex;align-items:center;gap:var(--s4);padding:0 var(--s8);background:var(--surface);border-bottom:1px solid var(--border);color:var(--tx)}
.sh-btn.sh-burger{display:none}
.sh-crumbs ol{display:flex;align-items:center;gap:var(--s1);list-style:none;margin:0;padding:0;font-size:var(--text-sm);min-width:0}
.sh-crumbs li{display:flex;align-items:center;gap:var(--s1);white-space:nowrap}
.sh-sep{color:var(--tx-3)}.sh-sep svg{width:14px;height:14px}
.sh-crumbs a{padding:4px 6px;border-radius:var(--radius-sm);color:var(--tx-2);text-decoration:none}
.sh-crumbs a:hover{color:var(--tx);background:var(--surface-hover)}
.sh-crumbs [aria-current="page"]{padding:4px 6px;color:var(--tx);font-weight:600}
.sh-crumbs .sh-plain{padding:4px 6px;color:var(--tx-3)}
.sh-plain-game{display:flex;align-items:center;gap:8px;color:var(--tx-2);padding:4px 6px}
.sh-top-r{margin-left:auto;display:flex;align-items:center;gap:var(--s3)}
.sh-vr{width:1px;height:24px;background:var(--border)}
.sh-who{display:flex;align-items:center;gap:10px;font-size:var(--text-sm)}
.sh-who b{display:block;font-weight:600;line-height:1.2}
.sh-who small{display:block;color:var(--tx-3);font-size:var(--text-xs);line-height:1.2}
.sh-av{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--border);color:var(--tx-2);font-size:11px;font-weight:600}
.sh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 var(--s3);border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--tx);font:inherit;font-size:var(--text-sm);font-weight:500;white-space:nowrap;cursor:pointer;text-decoration:none;transition:background .12s,border-color .12s,transform .08s}
.sh-btn:hover{background:var(--surface-hover);border-color:var(--border-strong)}
.sh-btn:active{transform:scale(.98)}
.sh-btn .sh-ic{width:15px;height:15px}
.sh-btn-ghost{background:none;border-color:transparent;color:var(--tx-2)}
.sh-btn-ghost:hover{background:var(--surface-hover);border-color:transparent;color:var(--tx)}
.sh-btn-icon{width:32px;padding:0}
.sh-btn-sm{height:28px;padding:0 10px;font-size:var(--text-xs)}
.sh-btn-primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.sh-btn-primary:hover{background:var(--accent-hover);border-color:var(--accent-hover)}
.sh-theme .i-sun{display:none}
html[data-theme="dark"] .sh-theme .i-sun{display:block}
html[data-theme="dark"] .sh-theme .i-moon{display:none}
.sh-side :focus-visible,.sh-top :focus-visible,#app:has(>.sh-side) main :focus-visible{outline:none;box-shadow:var(--focus)}

/* game switcher (combobox: search box + list) */
.sh-sw{position:relative}
.sh-sw-btn{display:flex;align-items:center;gap:var(--s2);height:32px;padding:0 var(--s2) 0 6px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);font:inherit;font-size:var(--text-sm);font-weight:600;color:var(--tx);cursor:pointer}
.sh-sw-btn:hover{background:var(--surface-hover);border-color:var(--border-strong)}
.sh-sw-btn .sh-ic{width:14px;height:14px;color:var(--tx-3)}
.sh-sw-pop{position:absolute;top:calc(100% + 6px);left:0;width:320px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-pop);z-index:40;overflow:hidden;animation:sh-pop .14s var(--ease)}
.sh-sw-pop[hidden]{display:none}
@keyframes sh-pop{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
.sh-sw-search{display:flex;align-items:center;gap:var(--s2);padding:0 var(--s3);border-bottom:1px solid var(--border);color:var(--tx-3)}
.sh-sw-search input{flex:1;height:40px;border:0;background:none;outline:none!important;box-shadow:none!important;font:inherit;font-size:var(--text-md);color:var(--tx);min-width:0}
.sh-sw-search input::placeholder{color:var(--tx-3)}
.sh-sw-group{padding:var(--s2) var(--s3) var(--s1);font-size:var(--text-xs);font-weight:500;color:var(--tx-3)}
.sh-sw-list{list-style:none;margin:0;padding:0 var(--s1) var(--s1);max-height:280px;overflow-y:auto}
.sh-sw-opt{display:flex;align-items:center;gap:10px;padding:var(--s2);border-radius:var(--radius);cursor:pointer;font-size:var(--text-md)}
.sh-sw-opt small{display:block;font-size:var(--text-xs);color:var(--tx-3);line-height:1.3}
.sh-sw-opt b{display:block;font-weight:500;line-height:1.3}
.sh-sw-opt[data-active="true"]{background:var(--surface-hover)}
.sh-sw-opt .sh-chk{margin-left:auto;color:var(--accent);visibility:hidden}
.sh-sw-opt[aria-selected="true"] .sh-chk{visibility:visible}
.sh-sw-opt .sh-cnt+.sh-chk{margin-left:0}
.sh-sw-empty{padding:var(--s4);text-align:center;font-size:var(--text-sm);color:var(--tx-3)}
.sh-sw-foot{border-top:1px solid var(--border);padding:var(--s1)}
.sh-sw-foot a{display:flex;align-items:center;gap:var(--s2);width:100%;padding:var(--s2);border-radius:var(--radius);font-size:var(--text-sm);color:var(--tx-2);text-decoration:none}
.sh-sw-foot a:hover{background:var(--surface-hover);color:var(--tx)}

/* empty / denied states */
.sh-empty{display:grid;place-items:center;text-align:center;padding:56px var(--s6);background:var(--surface);border:1px dashed var(--border-strong);border-radius:var(--radius-lg);color:var(--tx)}
.sh-empty-ic{width:44px;height:44px;border-radius:var(--radius-lg);background:var(--surface-2);border:1px solid var(--border);display:grid;place-items:center;color:var(--tx-2);margin-bottom:var(--s4)}
.sh-empty-ic .sh-ic{width:20px;height:20px}
.sh-empty h2{margin:0 0 6px;font-size:var(--text-lg);font-weight:600}
.sh-empty p{margin:0 auto;max-width:56ch;color:var(--tx-2);font-size:var(--text-md)}
.sh-empty .sh-acts{display:flex;gap:var(--s2);justify-content:center;margin-top:var(--s5);flex-wrap:wrap}
.sh-empty-meta{display:flex;gap:var(--s6);justify-content:center;flex-wrap:wrap;margin-top:var(--s6);padding-top:var(--s5);border-top:1px solid var(--border);font-size:var(--text-sm);color:var(--tx-2);width:100%;max-width:640px}
.sh-empty-meta div{display:flex;align-items:center;gap:var(--s2)}
.sh-scrim{display:none}

/* ===== overview ===== */
.ov-mono{font-family:var(--font-mono);font-size:var(--text-xs)}
.ov-faint{color:var(--tx-3)}
.ov-head{display:flex;align-items:flex-end;justify-content:space-between;gap:var(--s6);margin-bottom:var(--s6);flex-wrap:wrap;color:var(--tx)}
.ov-head h1{margin:0;font-size:var(--text-2xl);font-weight:600;letter-spacing:-.015em;line-height:1.2}
.ov-head p{margin:6px 0 0;color:var(--tx-2);max-width:72ch}
.ov-eyebrow{font-size:var(--text-xs);color:var(--tx-3);font-weight:500;margin-bottom:var(--s1)}
.ov-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:var(--s6);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--tx)}
.ov-kpi{padding:var(--s4) var(--s5);border-left:1px solid var(--border);display:flex;flex-direction:column}
.ov-kpi:first-child{border-left:0}
.ov-kpi>span{font-size:var(--text-sm);color:var(--tx-2)}
.ov-kpi b{font-size:var(--text-2xl);font-weight:600;letter-spacing:-.02em;line-height:1.25;margin:2px 0 var(--s2);font-variant-numeric:tabular-nums}
.ov-kpi b.hot{color:var(--warn)}
.ov-kpi .ov-lnk{margin-top:auto;align-self:flex-start;display:inline-flex;align-items:center;gap:4px;padding:0;font-size:var(--text-xs);color:var(--accent);font-weight:500;text-decoration:none}
.ov-kpi .ov-lnk:hover{text-decoration:underline;text-underline-offset:3px}
.ov-kpi .ov-lnk .sh-ic{width:13px;height:13px}
.ov-kpi .ov-sub{font-size:var(--text-xs);color:var(--tx-3);margin-top:auto}
.ov-sec-h{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 var(--s3);color:var(--tx)}
.ov-sec-h h2{margin:0;font-size:var(--text-lg);font-weight:600}
.ov-sec-h span{font-size:var(--text-sm);color:var(--tx-3)}
.ov-games{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:var(--s4);margin-bottom:var(--s8)}
.ov-gcard{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--tx);transition:border-color .15s,box-shadow .15s}
.ov-gcard:hover{border-color:var(--border-strong);box-shadow:0 2px 8px rgba(20,20,18,.04)}
.ov-gcard-h{display:flex;align-items:center;gap:var(--s3);padding:var(--s4) var(--s5)}
.ov-gcard-h h3{margin:0;font-size:var(--text-lg);font-weight:600;line-height:1.25}
.ov-gcard-h .ov-meta{display:flex;align-items:center;gap:var(--s2);margin-top:2px;font-size:var(--text-xs);color:var(--tx-3)}
.ov-gsec{padding:var(--s3) var(--s5);border-top:1px solid var(--border)}
.ov-gsec h4{margin:0 0 var(--s2);font-size:var(--text-xs);font-weight:500;color:var(--tx-3)}
.ov-sites{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.ov-sites li{display:grid;grid-template-columns:136px minmax(0,1fr);gap:var(--s2);align-items:center;font-size:var(--text-sm)}
.ov-sites .ov-lb{color:var(--tx-2)}
.ov-host{display:flex;align-items:center;gap:var(--s2);min-width:0}
.ov-host .ov-mono{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx)}
.ov-host a.ov-mono{text-decoration:none}
.ov-host a.ov-mono:hover{text-decoration:underline;text-underline-offset:3px}
.ov-sdot{width:7px;height:7px;border-radius:50%;flex:none;display:inline-block}
.ov-sdot.ok{background:var(--ok)}.ov-sdot.off{background:var(--tx-3)}.ov-sdot.bad{background:var(--danger)}
.ov-chips{display:flex;flex-wrap:wrap;gap:6px}
.ov-badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 var(--s2);border-radius:999px;font-size:var(--text-xs);font-weight:500;white-space:nowrap;background:var(--surface-2);color:var(--tx-2)}
.ov-badge.outline{background:none;border:1px solid var(--border)}
.ov-badge.info{background:var(--info-bg);color:var(--info);height:18px;padding:0 6px}
.ov-wait{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.ov-wait a{display:flex;align-items:center;gap:var(--s3);width:calc(100% + 16px);padding:6px var(--s2);margin:0 calc(var(--s2) * -1);border-radius:var(--radius);text-align:left;font-size:var(--text-sm);color:var(--tx);text-decoration:none}
.ov-wait a:hover{background:var(--surface-hover)}
.ov-wait b{min-width:28px;font-size:var(--text-lg);font-weight:600;font-variant-numeric:tabular-nums;color:var(--warn)}
.ov-wait .info b{color:var(--tx-2)}
.ov-wait .sh-ic{margin-left:auto;color:var(--tx-3);width:14px;height:14px}
.ov-none{font-size:var(--text-sm);color:var(--tx-3)}
.ov-gcard-f{margin-top:auto;display:flex;align-items:center;gap:var(--s3);padding:var(--s3) var(--s5);border-top:1px solid var(--border)}
.ov-gcard-f small{font-size:var(--text-xs);color:var(--tx-3)}
.ov-gcard-f .sh-btn{margin-left:auto}
.ov-av-stack{display:flex}
.ov-av-stack .sh-av{margin-left:-6px;box-shadow:0 0 0 2px var(--surface)}
.ov-av-stack .sh-av:first-child{margin-left:0}
.ov-below{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:var(--s4);align-items:start}
.ov-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--tx)}
.ov-card-h{display:flex;align-items:center;gap:var(--s3);padding:var(--s4) var(--s5);border-bottom:1px solid var(--border)}
.ov-card-h h2{margin:0;font-size:var(--text-lg);font-weight:600}
.ov-card-h .ov-r{margin-left:auto;display:flex;align-items:center;gap:var(--s2);font-size:var(--text-sm);color:var(--tx-3)}
.ov-card-b{padding:var(--s5)}
.ov-list{list-style:none;margin:0;padding:0}
.ov-list li{display:grid;align-items:center;gap:var(--s3);padding:var(--s3) var(--s5);border-bottom:1px solid var(--border);font-size:var(--text-sm)}
.ov-list li:last-child{border-bottom:0}
.ov-queue li{grid-template-columns:minmax(0,1fr) auto}
.ov-where{display:flex;align-items:center;gap:6px;font-size:var(--text-xs);color:var(--tx-3);margin-bottom:2px}
.ov-log li{grid-template-columns:96px minmax(0,1fr);align-items:baseline}
.ov-log time{font-size:var(--text-xs);color:var(--tx-3);font-variant-numeric:tabular-nums}
.ov-log b{font-weight:600}
.ov-perm{font-size:var(--text-sm);line-height:1.6;color:var(--tx-2)}
.ov-perm b{color:var(--tx);font-weight:600}

@media (max-width:1440px){
  :root,html[data-theme="light"]{--side-w:220px}
  #app:has(>.sh-side) main.wrap{padding:calc(var(--adm-h) + var(--s5)) var(--s6) 88px}
  .sh-top{padding:0 var(--s6)}
  .sh-who small{display:none}
}
@media (max-width:1100px){
  .ov-below{grid-template-columns:minmax(0,1fr)}
  .sh-who-txt{display:none}
}
@media (max-width:860px){
  .sh-side{transform:translateX(-100%);transition:transform .2s var(--ease);width:min(280px,86vw);box-shadow:var(--shadow-pop)}
  .sh-open .sh-side{transform:none}
  .sh-open .sh-scrim{display:block;position:fixed;inset:0;z-index:25;background:rgba(20,20,18,.42)}
  .sh-top{left:0;padding:0 var(--s4);gap:var(--s2)}
  .sh-btn.sh-burger{display:inline-flex}
  .sh-crumbs{min-width:0;overflow:hidden}
  #app:has(>.sh-side) main.wrap{margin-left:0;padding:calc(var(--adm-h) + var(--s4)) var(--s4) 80px}
  .ov-sites li{grid-template-columns:minmax(0,1fr)}
  .ov-kpi{border-left:0;border-top:1px solid var(--border)}
  .ov-kpi:first-child{border-top:0}
}
@media (prefers-reduced-motion:reduce){.sh-side{transition:none}}
`;
