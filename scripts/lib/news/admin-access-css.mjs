// admin-access-css.mjs — the look of the owner's screens (Phân quyền, Link mời, Mã cho Claude, Nhật ký) and of the sign-in pages.
// Follows the approved mock-up (huong-c.html, man-dang-nhap.html); shared pieces (buttons, cards, tables, notes…) come from
// admin-ui-css.mjs. Class names carry the prefix ac- (owner's screens) or au- (sign-in pages).
export const ACCESS_CSS = `
.ac-busy{opacity:.6;pointer-events:none}
.sh-note[hidden]{display:none}
.ac-who b{display:block;font-weight:500;line-height:1.3}
.ac-who small{display:block;font-size:var(--text-xs);color:var(--tx-3)}
.ac-warn{color:var(--warn)!important}
.ac-sp{margin-left:auto}
.ac-help{margin-top:var(--s3)}
.ac-gap{margin-bottom:var(--s3)}
.ac-note{font-size:var(--text-xs)}
.ac-lock{display:inline-flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--tx-3)}
.ac-lock .sh-ic{width:14px;height:14px}
.ac-line{font-size:var(--text-sm);line-height:1.5}
.ac-plain{font-size:var(--text-sm);line-height:1.6;color:var(--tx-2)}
.ac-plain b{color:var(--tx);font-weight:600}
.ac-small td,.ac-small th{padding-top:var(--s2);padding-bottom:var(--s2)}
.ac-wide{width:100%;height:36px;font-size:var(--text-md)}
.ac-btnrow{display:flex;align-items:center;gap:var(--s3);flex-wrap:wrap;font-size:var(--text-sm)}

/* waiting accounts */
.ac-pending{margin-bottom:var(--s6);border-color:var(--warn)}
.ac-pending .sh-card-h{background:var(--warn-bg);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.ac-pending .sh-card-h .sh-ic{color:var(--warn)}
.ac-pending td{vertical-align:middle}
.ac-ask{font-size:var(--text-sm);line-height:1.55;color:var(--tx)}
.ac-ask small{display:block;font-size:var(--text-xs);color:var(--tx-3);margin-bottom:2px}
.ac-ask b{font-weight:600}

/* by game: the game tabs and the table of ticks */
.ac-gtabs{display:flex;gap:var(--s2);margin-bottom:var(--s4);flex-wrap:wrap}
.ac-gtab{display:flex;align-items:center;gap:10px;padding:var(--s2) var(--s4) var(--s2) var(--s2);border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--surface);text-align:left;font:inherit;color:var(--tx);cursor:pointer}
.ac-gtab:hover{border-color:var(--border-strong)}
.ac-gtab[aria-pressed="true"]{border-color:var(--tx);box-shadow:inset 0 0 0 1px var(--tx)}
.ac-gtab b{display:block;font-size:var(--text-sm);font-weight:600;line-height:1.3}
.ac-gtab small{display:block;font-size:var(--text-xs);color:var(--tx-3);line-height:1.3}
.ac-matrix td{vertical-align:middle}
.ac-matrix th.ac-grp{text-align:center;border-left:1px solid var(--border);color:var(--tx-2);font-weight:600}
.ac-matrix th.ac-sub{text-align:center;border-left:1px solid var(--border)}
.ac-matrix th.ac-vb{vertical-align:bottom}
.ac-matrix td.ac-ck{text-align:center;border-left:1px solid var(--border);width:104px;padding:0}
.ac-matrix td.ac-all,.ac-matrix th.ac-all{background:var(--surface-2)}
.ac-matrix td:first-child{min-width:230px}
.ac-people td{vertical-align:middle}
.ac-people td:not(:first-child){min-width:150px}
.ac-cbx{appearance:none;-webkit-appearance:none;width:18px;height:18px;margin:0;border:1.5px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--surface);display:inline-grid;place-items:center;cursor:pointer;vertical-align:middle;flex:none;transition:background .1s,border-color .1s}
.ac-cbx:hover{border-color:var(--accent)}
.ac-cbx:checked{background:var(--accent);border-color:var(--accent)}
.ac-cbx:checked::after{content:"";width:4px;height:9px;border:solid var(--accent-ink);border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}
.ac-cbx:disabled{opacity:.45;cursor:not-allowed}
.ac-cbx:focus-visible{outline:none;box-shadow:var(--focus)}
.ac-hit{display:inline-grid;place-items:center;width:44px;height:44px;cursor:pointer}
.ac-addrow{display:flex;align-items:center;gap:var(--s3);padding:var(--s4) var(--s5);border-top:1px solid var(--border);flex-wrap:wrap;font-size:var(--text-sm)}
.ac-addrow label{font-weight:500}
.ac-addrow .sh-select{height:32px;min-width:220px}

/* forms: link and picking rights */
.ac-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s4);align-items:start}
.ac-stack{display:flex;flex-direction:column;gap:var(--s4)}
.ac-field{border:0;padding:0;margin:0 0 var(--s5);min-width:0}
.ac-lbl,.ac-field>label{display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:6px;padding:0}
.ac-choice{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:var(--s2)}
.ac-choice label{display:flex;align-items:center;gap:10px;padding:10px var(--s3);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:var(--text-sm);background:var(--surface)}
.ac-choice label:hover{border-color:var(--border-strong)}
.ac-choice label:has(input:checked){border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:var(--accent-soft)}
.ac-choice input{position:absolute;opacity:0;pointer-events:none}
.ac-choice label:has(input:focus-visible){box-shadow:var(--focus)}
.ac-gblock{border:0;padding:0;margin:0 0 var(--s5);min-width:0}
.ac-gblock legend{display:flex;align-items:center;gap:var(--s2);font-size:var(--text-md);font-weight:600;padding:0;margin-bottom:var(--s2)}
.ac-pgroup{border:1px solid var(--border);border-radius:var(--radius);margin-bottom:var(--s2);overflow:hidden}
.ac-pgroup h4{margin:0;padding:var(--s2) var(--s3);font-size:var(--text-xs);font-weight:600;color:var(--tx-2);background:var(--surface-2);border-bottom:1px solid var(--border)}
.ac-pgroup label,.ac-allgame{display:flex;align-items:center;gap:10px;padding:var(--s2) var(--s3);min-height:40px;font-size:var(--text-sm);cursor:pointer}
.ac-allgame{border:1px solid var(--border);border-radius:var(--radius);align-items:flex-start}
.ac-allgame .ac-cbx{margin-top:2px}
.ac-allgame small{display:block;font-size:var(--text-xs);color:var(--tx-3)}
.ac-summary{display:flex;gap:10px;padding:var(--s3) var(--s4);border-radius:var(--radius);background:var(--surface-2);font-size:var(--text-sm);color:var(--tx-2);margin-bottom:var(--s4)}
.ac-summary b{color:var(--tx)}
.ac-summary .sh-ic{margin-top:2px;color:var(--tx-3)}
.ac-linkbox{display:flex;gap:var(--s2);margin-bottom:var(--s2);align-items:flex-start}
.ac-linkbox code{flex:1;min-width:0;padding:var(--s2) var(--s3);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);font-family:var(--font-mono);font-size:var(--text-xs);line-height:1.6;overflow-wrap:anywhere;user-select:all}
.ac-fresh{border-color:var(--accent)}
.ac-kv{display:grid;grid-template-columns:90px minmax(0,1fr);gap:6px var(--s3);margin:var(--s3) 0 0;font-size:var(--text-sm)}
.ac-kv dt{color:var(--tx-3)}.ac-kv dd{margin:0}

/* Claude codes */
.ac-ownerkey{margin-bottom:var(--s6);border-color:var(--danger)}
.ac-ownerkey .sh-card-h{background:var(--danger-bg);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.ac-ownerkey .sh-card-h .sh-ic{color:var(--danger)}
.ac-okbody{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.ac-okbody>div{padding:var(--s5)}
.ac-okbody>div+div{border-left:1px solid var(--border)}
.ac-rules{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.ac-rules li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:var(--s2);font-size:var(--text-sm);color:var(--tx-2)}
.ac-rules li .sh-ic{margin-top:2px;color:var(--danger);width:15px;height:15px}
.ac-rules b{color:var(--tx)}
.ac-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ac-cannot{margin:var(--s3) 0 0;font-size:var(--text-sm);color:var(--danger)}
.ac-once{margin:var(--s3) 0;padding:var(--s3);border:1px dashed var(--danger);border-radius:var(--radius);background:var(--surface-2)}
.ac-once>p{display:flex;gap:6px;align-items:flex-start;margin:0 0 var(--s2);font-size:var(--text-sm);color:var(--danger);font-weight:500}
.ac-once>p .sh-ic{margin-top:2px}
.ac-once>code{display:block;font-family:var(--font-mono);font-size:var(--text-sm);overflow-wrap:anywhere;user-select:all;margin-bottom:var(--s3)}
.ac-codemake{display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;padding:var(--s4) var(--s5);border-bottom:1px solid var(--border)}
.ac-codemake .sh-select,.ac-codemake .sh-input{height:32px}
.ac-codemake .sh-input{min-width:260px}

/* the record */
.ac-log td{vertical-align:top}
.ac-logd{margin-top:2px;font-size:var(--text-xs);color:var(--tx-3)}
.ac-pager{border-top:1px solid var(--border)}

/* the sheet that opens one person */
.ac-sheet{position:fixed;top:0;right:0;bottom:0;width:min(520px,100vw);background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow-pop);z-index:61;display:flex;flex-direction:column;color:var(--tx);font-family:var(--font-sans);animation:ac-sheet-in .2s var(--ease)}
@keyframes ac-sheet-in{from{transform:translateX(24px);opacity:0}}
.ac-sheet-h{display:flex;align-items:flex-start;gap:var(--s3);padding:var(--s5);border-bottom:1px solid var(--border)}
.ac-sheet-h h2{margin:0;font-size:var(--text-lg);font-weight:600}
.ac-sheet-h p{margin:2px 0 0;font-size:var(--text-sm);color:var(--tx-2)}
.ac-sheet-h .sh-btn{margin-left:auto}
.ac-sheet-b{flex:1;overflow-y:auto;padding:var(--s5)}
.ac-sheet-f{display:flex;justify-content:flex-end;gap:var(--s2);padding:var(--s4) var(--s5);border-top:1px solid var(--border)}
.ac-sheet :focus-visible{outline:none;box-shadow:var(--focus)}
.ac-sheet .ac-cbx:focus-visible{box-shadow:var(--focus)}
.ac-sheet .sh-note b{font-weight:600}

@media (max-width:1100px){.ac-two,.ac-okbody{grid-template-columns:minmax(0,1fr)}.ac-okbody>div+div{border-left:0;border-top:1px solid var(--border)}}
@media (max-width:1440px){
  .ac-matrix td.ac-ck{width:76px}
  .ac-matrix th.ac-sub{padding-left:6px;padding-right:6px;white-space:normal;line-height:1.3}
  .ac-matrix td:first-child{min-width:196px}
  .ac-matrix td,.ac-matrix th{padding-left:var(--s3);padding-right:var(--s3)}
  .ac-matrix td.ac-ck,.ac-matrix th.ac-sub{padding-left:0;padding-right:0}
  .ac-matrix .sh-acts{flex-direction:column;align-items:flex-end;gap:2px}
  .ac-matrix td.ac-note{white-space:normal;max-width:96px}
}
@media (max-width:860px){
  .ac-addrow .sh-select{min-width:0;flex:1 1 180px}
  .ac-codemake .sh-input{min-width:0;flex:1 1 160px}
  .ac-sp{margin-left:0;flex:1 0 100%}
  .ac-sheet{width:100vw}
}
`;

export const AUTH_CSS = `
html:has(.au),html:has(.au) body{background:var(--bg);color:var(--tx);font-family:var(--font-sans);font-size:var(--text-md);line-height:1.5}
.au{min-height:100vh;display:flex;flex-direction:column;width:100%;color:var(--tx)}
.au-top{display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 var(--s8)}
.au-brand{display:flex;align-items:center;gap:var(--s3);color:var(--tx)}
.au-mark{width:28px;height:28px;border-radius:var(--radius);background:var(--tx);color:var(--surface);display:grid;place-items:center;font-weight:700;font-size:var(--text-sm)}
.au-brand b{display:block;font-size:var(--text-md);font-weight:600;line-height:1.2}
.au-brand small{display:block;font-size:var(--text-xs);color:var(--tx-3);line-height:1.2}
.au-mid{flex:1;display:grid;place-items:center;padding:var(--s6) var(--s4) 64px}
.au-box{width:min(420px,100%);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:0 1px 2px rgba(20,20,18,.04);padding:var(--s8)}
.au-box h1{margin:0 0 6px;font-size:var(--text-2xl);font-weight:600;letter-spacing:-.015em;line-height:1.2}
.au-lead{margin:0 0 var(--s6);color:var(--tx-2)}
.au-field{margin-bottom:var(--s4)}
.au-field>label{display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:6px}
.au-input{width:100%;height:40px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);font:inherit;font-size:var(--text-md);color:var(--tx)}
.au-input:hover{border-color:var(--border-strong)}
.au-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.au-input[aria-invalid="true"]{border-color:var(--danger)}
.au-hint{font-size:var(--text-xs);color:var(--tx-3);margin-top:4px}
.au-alert{display:flex;gap:10px;align-items:flex-start;padding:10px var(--s3);border-radius:var(--radius);background:var(--danger-bg);color:var(--tx);font-size:var(--text-sm);margin-bottom:var(--s4)}
.au-alert .sh-ic{color:var(--danger);margin-top:2px}
.au-alert[hidden]{display:none}
.au-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 var(--s4);border-radius:var(--radius);border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);font:inherit;font-size:var(--text-md);font-weight:500;text-decoration:none;cursor:pointer;white-space:nowrap}
.au-btn:hover{background:var(--accent-hover);border-color:var(--accent-hover)}
.au-btn:disabled{opacity:.5;cursor:not-allowed}
.au-btn:focus-visible,.au a:focus-visible{outline:none;box-shadow:var(--focus)}
.au-go{width:100%}
.au-alt{margin:var(--s5) 0 0;text-align:center;font-size:var(--text-sm);color:var(--tx-2)}
.au-alt a,.au-box a:not(.au-btn){color:var(--accent);font-weight:500}
.au-small{margin:var(--s3) 0 0;text-align:center;font-size:var(--text-xs);color:var(--tx-3)}
.au-invite{display:flex;flex-direction:column;gap:var(--s3);padding:var(--s3) var(--s4);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);margin-bottom:var(--s5)}
.au-ginv{display:flex;gap:var(--s3);align-items:flex-start}
.au-ginv b{display:block;font-weight:600}
.au-perm{font-size:var(--text-sm);color:var(--tx-2)}
.au-invite small{display:block;font-size:var(--text-xs);color:var(--tx-3)}
.au-doneic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--ok-bg);color:var(--ok);margin-bottom:var(--s4)}
.au-doneic .sh-ic{width:22px;height:22px}
.au-doneic.wait{background:var(--warn-bg);color:var(--warn)}
.au-done p{color:var(--tx-2);margin:0 0 var(--s3)}
.au-done p b{color:var(--tx)}
.au-done .au-go{margin-top:var(--s3)}
.au-foot{text-align:center;font-size:var(--text-xs);color:var(--tx-3);padding-bottom:var(--s6);margin:0}
@media (max-width:600px){.au-top{padding:0 var(--s4)}.au-box{padding:var(--s6) var(--s5)}}
`;
