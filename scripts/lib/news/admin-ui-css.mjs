// admin-ui-css.mjs — building blocks shared by the redrawn editor screens (buttons, badges, cards, notes, tables, the filter bar,
// the game header, dialogs and pop-up messages). Colours, sizes and spacing follow the approved mock-up (tokens.css) through the
// palette declared in admin-shell-css.mjs. Class names carry the prefix sh- so they never meet the older plain names.
export const UI_CSS = `
#app:has(>.sh-side){font-size:var(--text-md);line-height:1.5}
.sh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sh-mono{font-family:var(--font-mono);font-size:var(--text-xs)}
.sh-num{font-variant-numeric:tabular-nums}
.sh-muted{color:var(--tx-2)}.sh-faint{color:var(--tx-3)}

.sh-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.sh-btn-danger{background:var(--danger);border-color:var(--danger);color:var(--surface)}
.sh-btn-danger:hover{background:var(--danger);border-color:var(--danger);opacity:.9}
.sh-btn-ghost.sh-danger,.sh-btn-ghost.sh-danger:hover{color:var(--danger)}
.sh-btn.armed,.sh-btn.armed:hover{background:var(--danger);border-color:var(--danger);color:var(--surface)}
.sh-btn-xs{height:24px;padding:0 var(--s2);font-size:var(--text-xs)}

.sh-badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 var(--s2);border-radius:999px;font-size:var(--text-xs);font-weight:500;white-space:nowrap;background:var(--surface-2);color:var(--tx-2)}
.sh-badge.dot::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.sh-badge.outline{background:none;border:1px solid var(--border);color:var(--tx-2)}
.sh-badge .sh-ic{width:12px;height:12px}
.sh-b-ok{background:var(--ok-bg);color:var(--ok)}.sh-b-warn{background:var(--warn-bg);color:var(--warn)}.sh-b-danger{background:var(--danger-bg);color:var(--danger)}.sh-b-info{background:var(--info-bg);color:var(--info)}

.sh-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--tx)}
.sh-card-h{display:flex;align-items:center;gap:var(--s3);padding:var(--s4) var(--s5);border-bottom:1px solid var(--border)}
.sh-card-h h2{margin:0;font-size:var(--text-lg);font-weight:600}
.sh-card-h .sh-r{margin-left:auto;display:flex;align-items:center;gap:var(--s2)}
.sh-card-b{padding:var(--s5)}

.sh-page-h{display:flex;align-items:flex-end;justify-content:space-between;gap:var(--s6);margin-bottom:var(--s6);flex-wrap:wrap;color:var(--tx)}
.sh-page-h h1{margin:0;font-size:var(--text-2xl);font-weight:600;letter-spacing:-.015em;line-height:1.2}
.sh-page-h p{margin:6px 0 0;color:var(--tx-2);max-width:72ch}
.sh-page-h .sh-r{display:flex;gap:var(--s2);align-items:center}
.sh-eyebrow{font-size:var(--text-xs);color:var(--tx-3);font-weight:500;margin-bottom:var(--s1)}
.sh-hint{margin:0 0 var(--s4);font-size:var(--text-sm);color:var(--tx-2)}

.sh-note{display:flex;gap:10px;align-items:flex-start;padding:var(--s3) var(--s4);border-radius:var(--radius);background:var(--info-bg);color:var(--tx);font-size:var(--text-sm)}
.sh-note .sh-ic{margin-top:2px;color:var(--info)}
.sh-note.warn{background:var(--warn-bg)}.sh-note.warn .sh-ic{color:var(--warn)}
.sh-note.danger{background:var(--danger-bg)}.sh-note.danger .sh-ic{color:var(--danger)}
.sh-note.ok{background:var(--ok-bg)}.sh-note.ok .sh-ic{color:var(--ok)}
.sh-note .sh-btn{margin-left:var(--s2)}
.sh-note a{color:var(--accent)}
.sh-stack{display:flex;flex-direction:column;gap:var(--s3);margin-bottom:var(--s4)}
.sh-stack:empty{display:none}

.sh-tbl-wrap{overflow-x:auto}
.sh-table{border-collapse:collapse;width:100%}
.sh-table th{padding:10px var(--s4);text-align:left;font-size:var(--text-xs);font-weight:500;color:var(--tx-3);border-bottom:1px solid var(--border);white-space:nowrap;background:var(--surface);text-transform:none;letter-spacing:0}
.sh-table td{padding:var(--s3) var(--s4);border-bottom:1px solid var(--border);vertical-align:top;font-size:var(--text-md);white-space:normal}
.sh-table tbody tr:last-child td{border-bottom:0}
.sh-table tbody tr:hover td{background:var(--surface-hover)}
.sh-table td:first-child{min-width:240px}
.sh-table .t-r{text-align:right}
.sh-table .nowrap{white-space:nowrap}
.sh-acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:nowrap}
.sh-person{display:flex;align-items:center;gap:10px}
.sh-empty-cell{padding:48px var(--s4)!important;text-align:center}
.sh-empty-cell .sh-empty-ic{margin:0 auto var(--s3)}
.sh-empty-cell h3{margin:0 0 4px;font-size:var(--text-md);font-weight:600;color:var(--tx)}
.sh-empty-cell p{margin:0;font-size:var(--text-sm);color:var(--tx-2)}
.sh-table tbody tr.sh-empty-tr:hover td{background:none}

.sh-toolbar{display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s3);flex-wrap:wrap}
.sh-toolbar .sh-r{margin-left:auto;display:flex;gap:var(--s2);align-items:center}
.sh-seg{display:inline-flex;padding:2px;gap:2px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius)}
.sh-seg button{flex:none;white-space:nowrap;height:28px;padding:0 10px;border:0;border-radius:var(--radius-sm);background:none;font:inherit;font-size:var(--text-sm);color:var(--tx-2);display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.sh-seg button:hover{color:var(--tx)}
.sh-seg button[aria-pressed="true"]{background:var(--surface);color:var(--tx);font-weight:500;box-shadow:0 1px 2px rgba(20,20,18,.08)}
.sh-seg .n{font-size:var(--text-xs);color:var(--tx-3)}
.sh-select,.sh-input{height:32px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);font:inherit;font-size:var(--text-sm);color:var(--tx)}
.sh-select:hover,.sh-input:hover{border-color:var(--border-strong)}
textarea.sh-input{height:auto;padding:var(--s2) 10px;resize:vertical;min-height:84px;line-height:1.5}
.sh-input::placeholder{color:var(--tx-3)}
.sh-cnt-n{font-size:var(--text-sm);color:var(--tx-3)}

/* game header: mark, name, web addresses, and the parts as tabs */
.sh-ghead{display:flex;align-items:center;gap:var(--s4);margin-bottom:var(--s5);flex-wrap:wrap;color:var(--tx)}
.sh-ghead h1{margin:0;font-size:var(--text-2xl);font-weight:600;letter-spacing:-.015em;line-height:1.2}
.sh-hosts{display:flex;gap:var(--s4);flex-wrap:wrap;margin-top:4px;font-size:var(--text-xs);color:var(--tx-2)}
.sh-hosts>span{display:inline-flex;align-items:center;gap:6px}
.sh-hosts a{color:inherit;text-decoration:none}
.sh-hosts a:hover{text-decoration:underline;text-underline-offset:3px}
.sh-ghead .sh-r{margin-left:auto;display:flex;gap:var(--s2);align-items:center;font-size:var(--text-sm);color:var(--tx-2)}
.sh-tabs{display:flex;gap:var(--s1);border-bottom:1px solid var(--border);margin-bottom:var(--s5);overflow-x:auto}
.sh-tab{display:flex;align-items:center;gap:var(--s2);height:40px;padding:0 var(--s3);border-bottom:2px solid transparent;margin-bottom:-1px;font-size:var(--text-md);color:var(--tx-2);text-decoration:none;white-space:nowrap}
.sh-tab:hover{color:var(--tx)}
.sh-tab[aria-current="page"]{color:var(--tx);font-weight:600;border-bottom-color:var(--tx)}
.sh-tab .sh-cnt{margin-left:0}
.sh-sub2{margin:0 0 2px var(--s4)}
.sh-sub2 .sh-nv{min-height:28px;font-size:var(--text-xs)}

/* dialog */
.sh-dscrim{position:fixed;inset:0;background:rgba(20,20,18,.42);z-index:60;animation:sh-fade .15s}
@keyframes sh-fade{from{opacity:0}}
.sh-dlg{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(440px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-pop);z-index:61;color:var(--tx);font-family:var(--font-sans);animation:sh-dlg-in .16s var(--ease)}
@keyframes sh-dlg-in{from{opacity:0;transform:translate(-50%,-48%) scale(.98)}}
.sh-dlg-b{padding:var(--s5) var(--s5) var(--s4)}
.sh-dlg h2{margin:0 0 6px;font-size:var(--text-lg);font-weight:600}
.sh-dlg p{margin:0;color:var(--tx-2);font-size:var(--text-md)}
.sh-dlg-f{display:flex;justify-content:flex-end;gap:var(--s2);padding:var(--s3) var(--s5);border-top:1px solid var(--border);background:var(--surface-2);border-radius:0 0 var(--radius-lg) var(--radius-lg)}
.sh-dlg :focus-visible{outline:none;box-shadow:var(--focus)}

/* pop-up messages, bottom right */
.sh-toasts{position:fixed;right:var(--s6);bottom:var(--s6);z-index:80;display:flex;flex-direction:column;gap:var(--s2);align-items:flex-end;pointer-events:none}
.sh-toast{pointer-events:auto;display:flex;align-items:center;gap:10px;max-width:420px;padding:10px var(--s3) 10px var(--s4);background:var(--tx);color:var(--bg);border-radius:var(--radius);box-shadow:var(--shadow-pop);font-family:var(--font-sans);font-size:var(--text-sm);line-height:1.45;animation:sh-toast-in .18s var(--ease)}
@keyframes sh-toast-in{from{opacity:0;transform:translateY(8px)}}
.sh-toast .sh-ic{opacity:.8}
.sh-toast button{border:0;background:none;color:var(--bg);opacity:.7;padding:4px;border-radius:var(--radius-sm);display:grid;cursor:pointer}
.sh-toast button:hover{opacity:1}
@media (max-width:860px){.sh-toasts{left:var(--s4);right:var(--s4);bottom:var(--s4);align-items:stretch}.sh-toast{max-width:none}}

@media (max-width:1100px){.sh-ghead .sh-r{margin-left:0;flex:1 0 100%}}
.sh-ghead>div:nth-child(2){flex:1 1 220px;min-width:0}
@media (max-width:860px){.sh-ghead .sh-tile{width:36px!important;height:36px!important;font-size:14px!important}.sh-ghead h1{font-size:var(--text-xl)}.sh-hosts{flex-direction:column;gap:2px}}
@media (max-width:600px){.sh-plain-game{font-size:0;gap:0}.sh-sw-btn>span{display:none}}
`;
