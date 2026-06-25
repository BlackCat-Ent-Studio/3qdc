// i18n-overlay.mjs — DOM zh→vi for the wiki. Runtime overlay handles ONLY:
//   (1) UI chrome / nav / section headers / filters  — curated whole-word terms (no fragments)
//   (2) article titles                               — FULL-STRING dict (i18n-titles-dict.mjs)
//   (3) short metadata terms (tags / role / game)    — META_DICT
// Article BODY prose is pre-translated in the API snapshots on disk (see scripts/translate-bodies),
// so the overlay never tries to dictionary-fragment free prose (that caused the old word-salad).
// Engine: substring replace sorted longest-first → a whole title replaces before any short term.
import { TITLES_DICT, META_DICT } from './i18n-titles-dict.mjs';

// Curated UI whole-words ONLY. Every entry is a standalone label/header that renders on its own;
// NO single-char or verb fragments (推荐/解析/攻略/队/盾/灭…) — those glued into word-salad before.
const UI_DICT = {
  // top nav / chrome / list states
  '搜索': 'Tìm kiếm', '首页': 'Trang chủ', '查看更多': 'Xem thêm', '更多': 'Xem thêm', '其他': 'Khác',
  '排行榜': 'Bảng xếp hạng', '人气推荐': 'Đề xuất hot', '新手必看': 'Tân thủ nên xem', '创作大神': 'Cao thủ sáng tạo',
  '热门武将': 'Tướng hot', '热门内容': 'Nội dung hot', '文章详情': 'Chi tiết bài viết', '已经加载完毕': 'Đã tải xong',
  '加载更多': 'Tải thêm', '暂无数据': 'Chưa có dữ liệu', '返回': 'Quay lại', '展开': 'Mở rộng', '收起': 'Thu gọn',
  // left/right nav taxonomy (the 4 categories)
  '幻想服攻略': 'Hướng dẫn server Huyễn Tưởng', '幻想服': 'server Huyễn Tưởng',
  '阵容': 'Đội hình', '养成': 'Nuôi dưỡng', '玩法': 'Lối chơi',
  // collection sub-tab labels (.ant-tabs-tab-btn) — full-string so 阵容/玩法 never fragment them
  '月度阵容盘点': 'Tổng hợp đội hình hàng tháng', '主流阵容': 'Đội hình chủ lưu',
  '长期玩法': 'Lối chơi dài hạn', '限时玩法': 'Lối chơi giới hạn thời gian',
  '资讯&攻略': 'Tin tức & hướng dẫn', '开局推荐': 'Gợi ý khai cuộc', '细节提升': 'Nâng cao chi tiết',
  // section headers (whole compound — safe, render as standalone block titles)
  '养成攻略': 'Hướng dẫn nuôi dưỡng', '阵法攻略': 'Hướng dẫn trận pháp',
  '山河遗迹攻略': 'Hướng dẫn di tích Sơn Hà',
  // systems / proper nouns (multi-char, unambiguous whole words)
  '命魂系统': 'hệ Mệnh Hồn', '命魂': 'Mệnh Hồn', '觉醒技能': 'kỹ năng giác tỉnh', '觉醒': 'giác tỉnh',
  '培养系统': 'hệ bồi dưỡng', '风物志': 'Phong Vật Chí', '将魂录': 'Tướng Hồn Lục',
  '探骊寻珠': 'Thám Ly Tầm Châu', '诸道争锋': 'Chư Đạo Tranh Phong', '群雄逐鹿': 'Quần Hùng Trục Lộc',
  '山河遗迹': 'Di tích Sơn Hà', '元宝和代币': 'Nguyên Bảo và đại tệ',
  // faction / filter chips (whole 2-char words → translate correctly even standalone)
  '蜀国': 'Thục Quốc', '魏国': 'Ngụy Quốc', '吴国': 'Ngô Quốc', '群雄': 'Quần Hùng',
  // 萌新干货 module nouns (also appear as nav/filter labels)
  '神兵': 'Thần Binh', '灵宠': 'Linh Sủng', '风物': 'Phong Vật', '将魂': 'Tướng Hồn',
  '阵法': 'Trận Pháp', '战魂': 'Chiến Hồn', '善灵': 'Thiện Linh', '战灵': 'Chiến Linh',
  // article footer boilerplate (full string)
  '感谢小将军的阅读，请点击下方链接提供您对本篇帮助的反馈': 'Cảm ơn tướng quân đã đọc, vui lòng bấm liên kết bên dưới để gửi phản hồi về bài viết này',
};

// Merge: UI + metadata + full-string titles. Later keys win on collision; titles are authoritative.
const DICT = { ...UI_DICT, ...META_DICT, ...TITLES_DICT };

const TAB_TITLE = '3Q Đại Chiến - Wiki';

const SHIM_JS = `(function(){
  var D=${JSON.stringify(DICT)};
  var TT=${JSON.stringify(TAB_TITLE)};
  var K=Object.keys(D).sort(function(a,b){return b.length-a.length;});
  var HAN=/[\\u4e00-\\u9fff]/;
  function tr(s){ if(!s||!HAN.test(s))return s; var o=s; for(var i=0;i<K.length;i++){ if(o.indexOf(K[i])>-1)o=o.split(K[i]).join(D[K[i]]); } return o; }
  function fix(n){ if(n&&n.nodeValue&&HAN.test(n.nodeValue)){ var v=tr(n.nodeValue); if(v!==n.nodeValue)n.nodeValue=v; } }
  function walk(root){ try{ if(!root)return; if(root.nodeType===3){fix(root);return;} var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,b=[]; while((n=w.nextNode()))b.push(n); for(var i=0;i<b.length;i++)fix(b[i]); }catch(e){} }
  function run(){ walk(document.body); }
  if(document.readyState!=='loading')run(); else document.addEventListener('DOMContentLoaded',run);
  var mo=new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i]; if(m.type==='characterData'){fix(m.target);} else if(m.addedNodes){ for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j]); } } });
  (function start(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true,characterData:true}); else setTimeout(start,50); })();
  var c=0,iv=setInterval(function(){run(); if(++c>24)clearInterval(iv);},500);
  setInterval(run,1200);
})();`;

// "ba chấm": clamp card/list titles so longer Vietnamese never overflows.
const ELLIPSIS_CSS = `
.star-cj-article-list__text,.star-cj-article-card__title,[class*="article-list__text"],[class*="card__title"]{
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%;}
[class*="article-card__desc"],[class*="summary"],[class*="abstract"]{
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}`;

export const I18N_HTML = `<style data-mirror-ellipsis>${ELLIPSIS_CSS}</style><script data-mirror-i18n="zh-vi">${SHIM_JS}</script>`;
