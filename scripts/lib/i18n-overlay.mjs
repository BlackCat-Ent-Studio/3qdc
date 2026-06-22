// Single source of the DOM i18n overlay (zh -> vi). Injected into BOTH internal
// entries. Non-destructive: walks text nodes after render + on mutation and
// substring-replaces Chinese with Vietnamese via the dictionary. The umi bundle
// is never edited. Images (baked-in art) are NOT handled here — separate job.
//
// Rules: translate prose/labels; LEAVE legal identifiers (ICP / 备案 / license
// codes / email / domain) untouched by simply not listing them.

// Order-independent map; the shim sorts keys longest-first so composite strings
// (e.g. "应用名称：三国志幻想大陆 版本号：4.2.0") translate piecewise correctly.
const DICT = {
  '三国志幻想大陆': '3Q Đại Chiến',   // site-wide rebrand of the game name
  '五周年': '5 năm',
  '三国换将卡牌开创者': 'Người tiên phong thẻ bài đổi tướng Tam Quốc',
  '扫一扫下载游戏': 'Quét mã tải game',
  '官方微博': 'Weibo chính thức',
  '官方微信': 'WeChat chính thức',
  '官方Q群': 'Nhóm QQ chính thức',
  '官方贴吧': 'Tieba chính thức',
  '隐私政策': 'Chính sách bảo mật',
  '儿童个人信息保护规则': 'Quy tắc bảo vệ thông tin cá nhân trẻ em',
  '服务条款': 'Điều khoản dịch vụ',
  '权限说明': 'Giải thích quyền hạn',
  '功能介绍': 'Giới thiệu tính năng',
  '应用名称': 'Tên ứng dụng',
  '版本号': 'Phiên bản',
  '开发运营者': 'Nhà phát triển & vận hành',
  '公司名称': 'Tên công ty',
  '客服邮箱信息': 'Email CSKH',
  '公司地址': 'Địa chỉ công ty',
  '广州灵犀互动娱乐有限公司': 'Công ty TNHH Giải trí Tương tác Lingxi (Quảng Châu)',
  '广州市天河区高普路38号621房': 'Phòng 621, số 38 đường Cao Phổ, quận Thiên Hà, TP Quảng Châu',
  '版权所有': 'Bản quyền',
  '本公司积极履行': 'Công ty chúng tôi tích cực tuân thủ',
  '网络游戏行业防沉迷自律公约': 'Công ước tự giác chống nghiện ngành game trực tuyến',
  '电子营业执照': 'Giấy phép kinh doanh điện tử',
  // legal license lines — translate the descriptor, keep the ID number (fragments
  // so both PC "粤B2…" and mobile "B2…" variants work; sorted longest-first at runtime)
  '粤公网安备': 'Đăng ký an ninh mạng công cộng Quảng Đông số ',
  '粤ICP备': 'Giấy phép ICP Quảng Đông số ',
  '增值电信业务经营许可证': 'Giấy phép kinh doanh dịch vụ viễn thông GTGT ',
  '粤': 'Quảng Đông ',
  '号': '',
};

// Exact element-text overrides by selector (rebrand). Run AFTER translation;
// these win over the dictionary so the header reads the brand line verbatim.
const OVERRIDES = {
  '.mainTitle___qtaOT': '3Q Đại Chiến - Huyền Thoại Tam Quốc',
};

// Forced browser-tab title (umi may reset document.title at runtime → pin it).
const TAB_TITLE = '3Q Đại Chiến - Huyền Thoại Tam Quốc';

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
