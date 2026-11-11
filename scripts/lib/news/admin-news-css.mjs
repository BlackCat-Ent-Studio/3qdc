// admin-news-css.mjs — the look of the news screens: article list, trash, and the article editor (sticky action bar, writing
// column, right-hand settings column). Follows the approved mock-up; shared pieces (buttons, cards, notes…) come from
// admin-ui-css.mjs. Class names carry the prefix nw-.
export const NEWS_ADMIN_CSS = `
.nw-evrow{margin-bottom:var(--s3)}
.nw-evrow .nw-lbl small{font-weight:400;opacity:.7}
.nw-evrow .sh-input{width:100%}
/* article list and trash */
.nw-ptitle{display:flex;align-items:center;gap:var(--s3);min-width:0}
.nw-ptitle b{display:block;font-weight:500;line-height:1.35;color:var(--tx)}
.nw-ptitle small{display:block;color:var(--tx-3);font-size:var(--text-xs);margin-top:2px}
.nw-thumb{flex:none;width:72px;height:40px;border-radius:var(--radius-sm);object-fit:cover;background:var(--surface-2);border:1px solid var(--border)}
.nw-line{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:var(--text-xs)}
.nw-line.warn{color:var(--warn)}.nw-line.danger{color:var(--danger)}
.nw-line .sh-ic{width:13px;height:13px}
.nw-dot{width:7px;height:7px;border-radius:50%;flex:none;background:currentColor}
.nw-subt{display:block;color:var(--tx-3);font-size:var(--text-xs);margin-top:3px;font-variant-numeric:tabular-nums}
@media (max-width:1440px){.nw-table td,.nw-table th{padding-left:10px;padding-right:10px}.nw-table .sh-av{display:none}}
@media (max-width:1100px){.nw-ptitle .nw-thumb{display:none}}

/* sticky action bar of the editor */
.nw-edbar{position:sticky;top:var(--adm-h);z-index:15;display:flex;align-items:center;gap:var(--s4);height:64px;margin:calc(var(--s6) * -1) calc(var(--s8) * -1) var(--s5);padding:0 var(--s8);background:var(--bg);border-bottom:1px solid var(--border);color:var(--tx)}
.nw-edbar-l{display:flex;align-items:center;gap:var(--s3);min-width:0}
.nw-edbar h1{margin:0;font-size:var(--text-lg);font-weight:600;line-height:1.25;white-space:nowrap}
.nw-edbar-meta{display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;margin-top:2px;font-size:var(--text-xs);color:var(--tx-3)}
.nw-edbar-meta .sh-badge{height:20px}
.nw-edbar-r{margin-left:auto;display:flex;align-items:center;gap:var(--s2)}
.nw-acts{display:flex;gap:var(--s2)}
.nw-save-st{display:inline-flex;align-items:center;gap:6px;font-size:var(--text-sm);color:var(--tx-2);margin-right:var(--s2);white-space:nowrap}
.nw-save-st .nw-dot.ok{color:var(--ok)}.nw-save-st .nw-dot.warn{color:var(--warn)}
.nw-save-st .sh-ic{width:14px;height:14px}
.nw-save-st.dirty{color:var(--warn)}
.nw-edbar .sh-btn{height:34px}

/* the title and the address have their own look when focused (the box around them is the focus mark) */
#app:has(>.sh-side) main .nw-title:focus-visible,#app:has(>.sh-side) main .nw-slug input:focus-visible,#app:has(>.sh-side) main .nw-sum textarea:focus-visible{box-shadow:none}
#app:has(>.sh-side) main .nw-sum textarea:focus-visible,#app:has(>.sh-side) main .nw-paper .sh-input:focus-visible{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

/* two columns */
.nw-ed{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:var(--s5);align-items:start}
.nw-paper{padding:var(--s6) var(--s8) var(--s8)}
.nw-title{display:block;width:100%;border:0;background:none;resize:none;overflow:hidden;padding:0;font:inherit;font-size:28px;font-weight:600;line-height:1.3;letter-spacing:-.015em;color:var(--tx);outline:none;box-shadow:none}
.nw-title::placeholder{color:var(--tx-3)}
.nw-title:disabled,.nw-paper input:disabled,.nw-paper textarea:disabled{color:var(--tx);background:none;cursor:default;opacity:1;-webkit-text-fill-color:var(--tx)}
.nw-slug{display:flex;align-items:center;gap:6px;margin:var(--s2) 0 var(--s5);padding:6px var(--s2);border:1px dashed var(--border-strong);border-radius:var(--radius);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--tx-3)}
.nw-slug .sh-ic{width:14px;height:14px}
.nw-slug input{flex:1;min-width:0;border:0;background:none;outline:none;box-shadow:none;padding:2px 0;font:inherit;color:var(--tx)}
.nw-slug:focus-within{border-style:solid;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.nw-sum{position:relative;margin-bottom:var(--s5)}
.nw-sum label,.nw-lbl{display:block;font-size:var(--text-sm);font-weight:500;margin-bottom:6px;text-transform:none;letter-spacing:0;color:var(--tx)}
.nw-sum label span{font-weight:400;color:var(--tx-3)}
.nw-sum textarea{width:100%;min-height:64px;font-size:var(--text-md)}
.nw-count{position:absolute;right:var(--s2);bottom:6px;font-size:var(--text-xs);color:var(--tx-3);font-variant-numeric:tabular-nums;background:var(--surface);padding:0 4px}
.nw-count.over{color:var(--danger);font-weight:600}

/* formatting bar, sticky right under the action bar */
.nw-tb{position:sticky;top:calc(var(--adm-h) + 64px);z-index:10;display:flex;align-items:center;flex-wrap:wrap;gap:2px;padding:var(--s1);border:1px solid var(--border);border-radius:var(--radius) var(--radius) 0 0;background:var(--surface-2)}
.nw-tb[hidden]{display:none}
.nw-tb button{display:inline-flex;align-items:center;gap:6px;height:30px;min-width:30px;justify-content:center;padding:0 var(--s2);border:0;border-radius:var(--radius-sm);background:none;font:inherit;font-size:var(--text-sm);color:var(--tx-2);cursor:pointer}
.nw-tb button:hover{background:var(--surface);color:var(--tx)}
.nw-tb button[aria-expanded="true"]{background:var(--surface);color:var(--tx);box-shadow:0 1px 2px rgba(20,20,18,.08)}
.nw-tb button .sh-ic{width:15px;height:15px}
.nw-tb .sep{width:1px;height:18px;background:var(--border-strong);margin:0 var(--s1)}
.nw-tb .bb{font-weight:700;font-family:Georgia,serif;font-size:15px}.nw-tb .ii{font-style:italic;font-family:Georgia,serif;font-size:15px}
.nw-pop{border:1px solid var(--border);border-top:0;background:var(--surface);padding:var(--s3) var(--s4);animation:sh-fade .14s var(--ease)}
.nw-pop-row{display:flex;align-items:center;gap:var(--s3);flex-wrap:wrap}
.nw-pop-row .sh-input{flex:1;min-width:240px}
.nw-pop h4{margin:var(--s3) 0 var(--s2);font-size:var(--text-xs);font-weight:500;color:var(--tx-3)}
.nw-pop p{margin:var(--s2) 0 0;font-size:var(--text-xs);color:var(--tx-3)}
.nw-pics{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:var(--s2)}
.nw-pic{padding:0;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);overflow:hidden;aspect-ratio:16/9;display:block;cursor:pointer}
.nw-pic img{display:block;width:100%;height:100%;object-fit:cover}
.nw-pic:hover{border-color:var(--accent)}
.nw-pic.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.nw-upl{position:relative;overflow:hidden}
.nw-upl input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.nw-upl:focus-within{box-shadow:var(--focus)}

/* the writing area */
.nw-ce{min-height:440px;padding:var(--s5) var(--s6);border:1px solid var(--border);border-top:0;border-radius:0 0 var(--radius) var(--radius);outline:none;background:var(--surface);font-size:16px;line-height:1.7;color:var(--tx);overflow-wrap:anywhere}
.nw-ce:focus{border-color:var(--border-strong)}
.nw-ce:empty::before{content:attr(data-ph);color:var(--tx-3)}
.nw-ce[contenteditable="false"]{background:var(--surface-2)}
.nw-ce>*:first-child{margin-top:0}
.nw-ce h2{font-size:var(--text-xl);font-weight:600;margin:1.4em 0 .5em;line-height:1.3;color:var(--tx)}
.nw-ce h3{font-size:var(--text-lg);font-weight:600;margin:1.2em 0 .4em;color:var(--tx)}
.nw-ce p{margin:0 0 .9em}
.nw-ce ul,.nw-ce ol{margin:0 0 .9em;padding-left:1.4em}
.nw-ce a{color:var(--accent);text-underline-offset:3px}
.nw-ce .tbl{overflow-x:auto;margin:0 0 1em}
.nw-ce table{border-collapse:collapse;border:1px solid var(--border);font-size:var(--text-md)}
.nw-ce th,.nw-ce td{border:1px solid var(--border);padding:6px 10px;font-size:var(--text-md);background:none;text-align:left}
.nw-ce th{background:var(--surface-2);color:var(--tx);font-weight:600}
.nw-ce td img,.nw-ce th img{display:inline-block;width:auto;max-height:56px;vertical-align:middle;border-radius:4px;margin:2px 6px 2px 0}
.nw-ce .gift{display:inline-block;margin:0 0 1em;padding:10px 16px;border:1px dashed var(--accent);border-radius:var(--radius);background:var(--accent-soft)}
.nw-ce .gift small{display:block;font-size:var(--text-xs);color:var(--tx-2)}
.nw-ce .gift code{font-family:var(--font-mono);font-size:var(--text-lg);font-weight:500;color:var(--accent);letter-spacing:.04em}
.nw-ce .note{display:block;margin:0 0 1em;padding:10px 14px;border-left:3px solid var(--warn);border-radius:0 var(--radius) var(--radius) 0;background:var(--warn-bg);font-size:var(--text-md)}
.nw-ce figure{margin:0 0 1em}
.nw-ce figure img{display:block;max-width:100%;border-radius:var(--radius)}
.nw-ce figcaption{font-size:var(--text-sm);color:var(--tx-3);margin-top:6px}

/* right-hand column */
.nw-rail{display:flex;flex-direction:column;gap:var(--s4);min-width:0}
.nw-rail .sh-card-h{padding:var(--s3) var(--s4)}
.nw-rail .sh-card-h h2{font-size:var(--text-md)}
.nw-rail .sh-card-b{padding:var(--s4)}
.nw-rail p{margin:0;font-size:var(--text-sm)}
.nw-opts{display:flex;flex-direction:column;gap:6px}
.nw-opt{display:flex;align-items:flex-start;gap:10px;padding:10px var(--s3);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:var(--text-sm);background:var(--surface)}
.nw-opt:hover{border-color:var(--border-strong)}
.nw-opt:has(input:checked){border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)}
.nw-opt:has(input:focus-visible){box-shadow:var(--focus)}
.nw-opt:has(input:disabled){cursor:not-allowed;opacity:.6}
.nw-opt input{margin:3px 0 0;accent-color:var(--accent)}
.nw-opt b{display:block;font-weight:500;line-height:1.35}
.nw-opt small{display:block;color:var(--tx-3);font-size:var(--text-xs)}
.nw-when{margin-top:var(--s3)}
.nw-when[hidden]{display:none}
.nw-when .sh-input{width:100%;height:36px;font-size:var(--text-md)}
.nw-ckrow{display:flex;align-items:flex-start;gap:10px;margin-top:var(--s3);font-size:var(--text-sm);cursor:pointer}
.nw-ckrow input{margin:3px 0 0;accent-color:var(--accent);width:16px;height:16px}
.nw-ckrow small{display:block;color:var(--tx-3);font-size:var(--text-xs)}
.nw-help{margin-top:var(--s3)!important;font-size:var(--text-xs)!important;color:var(--tx-3)}
.nw-choice{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s2)}
.nw-choice label{display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 6px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:var(--text-sm);background:var(--surface);text-align:center}
.nw-choice label:hover{border-color:var(--border-strong)}
.nw-choice label:has(input:checked){border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:var(--accent-soft)}
.nw-choice label:has(input:focus-visible){box-shadow:var(--focus)}
.nw-choice label:has(input:disabled){cursor:not-allowed;opacity:.6}
.nw-choice input{position:absolute;opacity:0;pointer-events:none}
.nw-cover-big{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);margin-bottom:var(--s3)}
.nw-cover-empty{display:grid;place-items:center;width:100%;aspect-ratio:16/9;border:1px dashed var(--border-strong);border-radius:var(--radius);color:var(--tx-3);font-size:var(--text-sm);margin-bottom:var(--s3);text-align:center;padding:var(--s3)}
.nw-rail .nw-pics{grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:var(--s3)}
.nw-fb{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface-2)}
.nw-fb img,.nw-fb .nw-fb-empty{display:block;width:100%;aspect-ratio:1.91/1;object-fit:cover;background:var(--border)}
.nw-fb-b{padding:var(--s2) var(--s3)}
.nw-fb-b small{display:block;font-size:11px;color:var(--tx-3);text-transform:uppercase;letter-spacing:.02em}
.nw-fb-b b{font-size:var(--text-sm);font-weight:600;line-height:1.35;margin:2px 0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--tx)}
.nw-fb-b p{margin:0!important;font-size:var(--text-xs)!important;color:var(--tx-2);overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}
.nw-hist{list-style:none;margin:0;padding:0}
.nw-hist li{display:flex;align-items:center;gap:10px;padding:var(--s2) 0;border-bottom:1px solid var(--border);font-size:var(--text-sm)}
.nw-hist li:last-child{border-bottom:0}
.nw-hist .sh-av{width:24px;height:24px;font-size:10px}
.nw-hist span.nw-h-t{flex:1;min-width:0;line-height:1.35}
.nw-hist small{display:block;color:var(--tx-3);font-size:var(--text-xs)}
.nw-hist .sh-btn{flex:none}
.nw-danger-card{border-color:var(--danger-bg)}
.nw-rail textarea.sh-input{width:100%}
.nw-err{font-size:var(--text-xs);color:var(--danger);margin-top:var(--s2)}

@media (max-width:1440px){
  .nw-edbar{margin:calc(var(--s5) * -1) calc(var(--s6) * -1) var(--s4);padding:0 var(--s6)}
  .nw-ed{grid-template-columns:minmax(0,1fr) 300px;gap:var(--s4)}
  .nw-paper{padding:var(--s5) var(--s6) var(--s6)}
  .nw-tb .lb{display:none}
  .nw-save-st .long{display:none}
}
@media (max-width:1100px){.nw-ed{grid-template-columns:minmax(0,1fr)}.nw-edbar{height:auto;min-height:64px;flex-wrap:wrap;padding-block:var(--s2)}.nw-tb{position:static}}
@media (max-width:860px){
  .nw-edbar{position:static;margin:0 0 var(--s4);padding:var(--s2) 0}
  .nw-paper{padding:var(--s4)}
  .nw-ce{padding:var(--s4) var(--s3);min-height:320px}
  .nw-title{font-size:24px}
  .nw-toolbar-wrap{overflow-x:auto}
  .nw-rail .nw-pics{grid-template-columns:repeat(3,1fr)}
  .nw-edbar .sh-btn,.nw-rail .sh-btn{min-height:44px}
  .nw-edbar-r{flex-wrap:wrap}
  .sh-toolbar .sh-select{flex:1 1 140px;min-height:40px}
  .sh-seg{overflow-x:auto;max-width:100%}
  /* the list becomes one card per article */
  .nw-table{display:block}.nw-table thead{display:none}
  .nw-table tbody{display:flex;flex-direction:column;gap:10px;padding:var(--s2)}
  .nw-table tr{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:12px 14px}
  .nw-table td{display:block;padding:0;border:0;flex:0 0 auto;min-width:0!important}
  .nw-table td:first-child,.nw-table td:last-child{flex:1 0 100%}
  .nw-table td[colspan]{flex:1 0 100%}
  .nw-table tbody tr:hover td{background:none}
  .nw-table .nw-c-author{display:none}
  .nw-table .sh-acts{justify-content:flex-start;flex-wrap:wrap}
  .nw-table .sh-acts .sh-btn{flex:1 1 auto;min-height:44px}
}
`;
