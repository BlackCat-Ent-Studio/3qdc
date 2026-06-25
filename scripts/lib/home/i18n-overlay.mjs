// DOM i18n overlay (zh -> vi) for the /#/index route. Injected into the served
// index.html. Non-destructive: walks text nodes after render + on mutation and
// substring-replaces Chinese with Vietnamese via the dictionary. The umi bundle
// is never edited. Baked-in IMAGE text (hero / logo / nav / buttons) is NOT
// handled here — that is a separate artwork-swap job.
//
// NOTE: most visible Chinese on /#/index lives in images, so this dict is small.
// Listed terms also cover any late-rendered prose / alt-driven text nodes.

const DICT = {
  '三国志幻想大陆': '3Q Đại Chiến',   // game name (mostly image, but title/text safety)
  '扫一扫下载游戏': 'Quét mã tải game', // the one real DOM text node on the page
  '国创加强版': 'Bản Nâng Cấp',
  '官方充值中心': 'Trung tâm nạp chính thức',
  '六周年': '6 năm',
  '五周年': '5 năm',
};

// Exact element-text overrides by selector. (None needed on index yet — kept for
// parity with the fab overlay so future rebrand lines can be pinned here.)
const OVERRIDES = {};

// Forced browser-tab title (umi resets document.title at runtime → pin it).
const TAB_TITLE = 'Trang chủ 3Q Đại Chiến';

const SHIM_JS = `(function(){
  var D=${JSON.stringify(DICT)};
  var OV=${JSON.stringify(OVERRIDES)};
  var TT=${JSON.stringify(TAB_TITLE)};
  var K=Object.keys(D).sort(function(a,b){return b.length-a.length;});
  var HAN=/[\\u4e00-\\u9fff]/;
  function tr(s){ if(!s||!HAN.test(s))return s; var o=s; for(var i=0;i<K.length;i++){ if(o.indexOf(K[i])>-1)o=o.split(K[i]).join(D[K[i]]); } return o; }
  function fixNode(n){ if(n&&n.nodeValue&&HAN.test(n.nodeValue)){ var v=tr(n.nodeValue); if(v!==n.nodeValue)n.nodeValue=v; } }
  function walk(root){ try{ if(!root)return; if(root.nodeType===3){fixNode(root);return;} var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,b=[]; while((n=w.nextNode()))b.push(n); for(var i=0;i<b.length;i++)fixNode(b[i]); }catch(e){} }
  function applyOv(){ try{ for(var sel in OV){ var els=document.querySelectorAll(sel); for(var i=0;i<els.length;i++){ if(els[i].textContent!==OV[sel])els[i].textContent=OV[sel]; } } }catch(e){} }
  function run(){ walk(document.body); applyOv(); if(document.title!==TT)document.title=TT; }
  if(document.readyState!=='loading')run(); else document.addEventListener('DOMContentLoaded',run);
  var mo=new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i]; if(m.type==='characterData'){fixNode(m.target);} else if(m.addedNodes){ for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j]); } } });
  (function start(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true,characterData:true}); else setTimeout(start,50); })();
  var c=0,iv=setInterval(function(){run(); if(++c>24)clearInterval(iv);},500); // sweep ~12s for late React renders
})();`;

export const I18N_HTML = `<script data-mirror-i18n="zh-vi">${SHIM_JS}</script>`;
