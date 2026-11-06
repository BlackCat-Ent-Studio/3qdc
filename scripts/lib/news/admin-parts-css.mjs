// admin-parts-css.mjs — the look of the gift tickets, early sign-ups and background music screens. Follows the approved
// mock-up; shared pieces (buttons, cards, tables, notes…) come from admin-ui-css.mjs. Class names carry the prefix pt-.
export const PARTS_CSS = `
.pt-intro{margin:0;font-size:var(--text-sm);color:var(--tx-2);flex:1 1 420px}
.pt-intro a{color:var(--accent)}
.pt-help{margin:var(--s3) 0 0;font-size:var(--text-xs);color:var(--tx-3)}
.pt-warn{color:var(--warn);font-weight:600}
.pt-ic{display:inline-flex;vertical-align:middle}

/* gift tickets */
.pt-ph td{vertical-align:top}
.pt-who b{display:block;font-weight:600}
.pt-who small{display:block;font-size:var(--text-xs);color:var(--tx-3);margin-top:2px}
.pt-who .pt-mail{display:flex;align-items:center;gap:4px;color:var(--tx-2);overflow-wrap:anywhere}
.pt-who .pt-mail .sh-ic{width:13px;height:13px;flex:none}
.pt-gifts{margin:0;padding-left:1.1em;font-size:var(--text-sm)}
.pt-gifts li+li{margin-top:2px}
.pt-note{font-size:var(--text-sm);color:var(--tx-2);max-width:28ch;overflow-wrap:anywhere}
.pt-by{display:block;color:var(--tx-3);font-size:var(--text-xs);margin-top:3px;font-variant-numeric:tabular-nums}
.pt-handle{display:flex;flex-direction:column;gap:6px;min-width:240px}
.pt-handle .sh-input{width:100%}
.pt-handle .pt-acts{display:flex;gap:6px;flex-wrap:wrap}
.pt-reply{font-size:var(--text-sm);color:var(--tx-2);padding:6px var(--s2);border-left:2px solid var(--border-strong);background:var(--surface-2);border-radius:0 var(--radius-sm) var(--radius-sm) 0;overflow-wrap:anywhere}
.pt-reply.none{color:var(--tx-3);border-left-color:var(--border)}
.pt-busy td{opacity:.55}
@media (max-width:1440px){.pt-ph td,.pt-ph th{padding-left:10px;padding-right:10px}.pt-handle{min-width:220px}}

/* early sign-ups */
.pt-dk{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:var(--s4);align-items:start}
.pt-find{display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;padding:var(--s3) var(--s4);border-bottom:1px solid var(--border)}
.pt-sbox{display:flex;align-items:center;gap:var(--s2);height:32px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--tx-3);min-width:260px}
.pt-sbox:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.pt-sbox input{border:0;background:none;outline:none;flex:1;min-width:0;font:inherit;font-size:var(--text-sm);color:var(--tx)}
.pt-find .pt-r{margin-left:auto;font-size:var(--text-sm);color:var(--tx-2)}
.pt-phone{font-family:var(--font-mono);font-size:var(--text-md);font-weight:500}
.sh-table td.sh-mono{font-size:var(--text-xs)}
.pt-pager{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);padding:var(--s3) var(--s4);border-top:1px solid var(--border);font-size:var(--text-sm);color:var(--tx-2)}
.pt-big{font-size:var(--text-2xl);font-weight:600;letter-spacing:-.02em;line-height:1.2}
.pt-side .sh-card+.sh-card{margin-top:var(--s4)}
.pt-side p{margin:0;font-size:var(--text-sm);color:var(--tx-2)}
.pt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:var(--s3) 0}
.pt-moc-row{display:flex;gap:var(--s2)}
.pt-moc-row .sh-input{flex:1;min-width:0;height:36px;font-family:var(--font-mono);font-size:var(--text-sm)}
.pt-err{font-size:var(--text-xs);color:var(--danger);margin-top:4px}
.pt-dk mark{background:var(--accent-soft);color:var(--accent);border-radius:2px;padding:0 1px}
@media (max-width:1440px){.pt-dk{grid-template-columns:minmax(0,1fr) 300px}.pt-moc-row{flex-direction:column;align-items:stretch}.pt-moc-row .sh-input{flex:none}.pt-moc-row .sh-btn{align-self:flex-end}}
@media (max-width:1100px){.pt-dk{grid-template-columns:minmax(0,1fr)}}

/* background music */
.pt-usage{display:flex;align-items:center;gap:var(--s4);padding:var(--s4) var(--s5);border-bottom:1px solid var(--border);flex-wrap:wrap}
.pt-usage span{font-size:var(--text-sm);color:var(--tx-2)}
.pt-meter{flex:1 1 260px;height:8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden}
.pt-meter i{display:block;height:100%;background:var(--accent);border-radius:999px}
.pt-meter.hot i{background:var(--warn)}
.pt-song{display:flex;align-items:center;gap:var(--s3)}
.pt-song-ic{width:36px;height:36px;border-radius:var(--radius);display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--border);color:var(--tx-2);flex:none}
.pt-song b{display:block;font-weight:500;overflow-wrap:anywhere}
.pt-song small{display:block;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--tx-3);overflow-wrap:anywhere}
.pt-audio{height:32px;width:240px;max-width:100%;display:block}
.pt-tip{display:flex;gap:var(--s3);align-items:flex-start;font-size:var(--text-sm);color:var(--tx-2);padding:var(--s4) var(--s5);border-top:1px solid var(--border)}
.pt-tip .sh-ic{margin-top:2px;flex:none}
.pt-tip code{font-family:var(--font-mono);font-size:var(--text-xs);background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1px 6px;color:var(--tx)}
.pt-upl{position:relative;overflow:hidden;cursor:pointer}
.pt-upl input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.pt-upl:focus-within{box-shadow:var(--focus)}
.pt-up td{background:var(--accent-soft)}
@media (max-width:1440px){.pt-audio{width:200px}}

@media (max-width:860px){
  .pt-sbox{min-width:0;flex:1 1 180px}
  .pt-find .pt-r{margin-left:0;flex:1 0 100%}
  .pt-find .sh-btn,.pt-pager .sh-btn,.pt-moc-row .sh-btn,.pt-handle .sh-btn,.pt-toolbar .sh-btn{min-height:44px}
  .pt-sbox,.pt-moc-row .sh-input,.pt-handle .sh-input{min-height:44px}
  .sh-toolbar .sh-select{flex:1 1 140px;min-height:40px}
  .sh-seg{overflow-x:auto;max-width:100%}
  /* each row becomes a card */
  .pt-table{display:block}.pt-table thead{display:none}
  .pt-table tbody{display:flex;flex-direction:column;gap:10px;padding:var(--s2)}
  .pt-table tr{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:12px 14px}
  .pt-table td{display:block;padding:0;border:0;flex:0 0 auto;min-width:0!important}
  .pt-table td:first-child,.pt-table td:last-child{flex:1 0 100%}
  .pt-table td[colspan]{flex:1 0 100%}
  .pt-table tbody tr:hover td{background:none}
  .pt-table .sh-acts{justify-content:flex-start;flex-wrap:wrap}
  .pt-table .sh-acts .sh-btn{flex:1 1 auto;min-height:44px}
  .pt-handle{min-width:0}
  .pt-audio{width:100%;height:40px}
  .pt-upl{min-height:44px}
}

/* trash of a game */
.tr-seg{max-width:100%;overflow-x:auto}
.tr-tab{flex:none;white-space:nowrap;height:28px;padding:0 10px;border-radius:var(--radius-sm);font-size:var(--text-sm);color:var(--tx-2);display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.tr-tab:hover{color:var(--tx)}
.tr-tab[aria-pressed="true"]{background:var(--surface);color:var(--tx);font-weight:500;box-shadow:0 1px 2px rgba(20,20,18,.08)}
.tr-tab .n{font-size:var(--text-xs);color:var(--tx-3)}
.tr-table td{vertical-align:top}
.tr-who b{display:block;font-weight:600}
.tr-who small{display:block;font-size:var(--text-xs);color:var(--tx-3);margin-top:2px;overflow-wrap:anywhere}
.tr-gifts{margin:0;padding-left:1.1em;font-size:var(--text-sm)}
.tr-phone{font-family:var(--font-mono);font-size:var(--text-md);font-weight:500}
`;
