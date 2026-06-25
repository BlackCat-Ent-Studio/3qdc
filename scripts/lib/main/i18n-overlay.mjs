// DOM i18n overlay (zh -> vi) for the /#/main section. Injected into the served
// index.html (covers all sub-routes via the hash router). Non-destructive: walks
// text nodes after render + on mutation and substring-replaces Chinese with
// Vietnamese. Substring strategy → UI labels translate fully; long news/bio/skill
// text gets its COMMON terms translated (event/proper nouns stay zh) and the
// companion CSS clamps overflow with an ellipsis ("…"). Bundle is never edited.

import { CODEX_DICT } from './i18n-codex-dict.mjs';
import { BIOS_DICT } from './i18n-person-bios.mjs';
import { BIOS2_DICT } from './i18n-person-bios2.mjs';

const DICT = {
  // ---- left nav ----
  '首页': 'Trang chủ', '新闻资讯': 'Tin tức', '企划内容': 'Kế hoạch',
  '武将资料': 'Tướng', '游戏特色': 'Đặc sắc', '官方充值中心': 'Nạp game',
  '藏宝阁': 'Kho báu', '攻略WIKI': 'Hướng dẫn', '攻略': 'Hướng dẫn',
  '同人社区': 'Cộng đồng', '周边商城': 'Cửa hàng',
  // ---- news tabs / type labels ----
  '最新': 'Mới nhất', '新闻': 'Tin tức', '公告': 'Thông báo', '活动': 'Sự kiện',
  '官方公告': 'Thông báo chính thức', '官方漫画': 'Truyện tranh chính thức', '动态漫画': 'Truyện tranh động',
  '武将番外': 'Ngoại truyện tướng', '武将Q版': 'Tướng bản Q', '武将': 'Tướng',
  '官方视频': 'Video chính thức', '官方壁纸': 'Hình nền chính thức', '剧情CG': 'CG cốt truyện',
  '官方BGM': 'BGM chính thức', '官方': 'Chính thức', '表情包': 'Bộ sticker',
  '同人图': 'Tranh đồng nhân', '同人文': 'Truyện đồng nhân', '同人影音': 'Phim & nhạc đồng nhân',
  '同人活动': 'Sự kiện đồng nhân', '同人': 'Đồng nhân',
  // ---- person / skills ----
  '普攻': 'Đòn thường', '怒攻': 'Nộ kích', '被动': 'Bị động', '觉醒': 'Giác tỉnh',
  '扫一扫下载游戏': 'Quét mã tải game', '黑石稔': 'Hắc Thạch Nhẫm',
  '查看更多': 'Xem thêm', '更多': 'Xem thêm', '加载更多': 'Tải thêm', '暂无': 'Chưa có',
  // ---- common phrases inside long content (substring) ----
  '活动预告': 'Dự báo sự kiện', '即将上线': 'sắp ra mắt', '明日开启': 'mở vào ngày mai',
  '新版本上线': 'phiên bản mới ra mắt', '全新': 'hoàn toàn mới', '魂将活动': 'sự kiện Hồn Tướng',
  '魂将': 'Hồn Tướng', '年度购物节': 'lễ hội mua sắm thường niên', '来袭': 'đổ bộ',
  '国庆': 'Quốc khánh', '上线': 'ra mắt', '开启': 'mở',
  '法术伤害': 'sát thương phép', '物理伤害': 'sát thương vật lý', '灼烧': 'Thiêu đốt',
  '敌方全体': 'toàn bộ địch', '我方全体': 'toàn bộ phe ta', '随机': 'ngẫu nhiên',
  '持续时间': 'thời gian duy trì', '状态': 'trạng thái', '单位': 'đơn vị', '行动': 'hành động',
  '驱散': 'xua tan', '蔓延': 'lan ra', '相邻': 'liền kề', '目标': 'mục tiêu', '伤害': 'sát thương',
  '大都督': 'Đại Đô Đốc', '江东': 'Giang Đông', '汗马功劳': 'công lao hãn mã',
  // ---- hero names (Hán-Việt) ----
  '周瑜': 'Chu Du', '诸葛亮': 'Gia Cát Lượng', '曹操': 'Tào Tháo', '吕布': 'Lữ Bố',
  '刘备': 'Lưu Bị', '关羽': 'Quan Vũ', '张飞': 'Trương Phi', '赵云': 'Triệu Vân',
  '孙权': 'Tôn Quyền', '孙策': 'Tôn Sách', '司马懿': 'Tư Mã Ý', '曹丕': 'Tào Phi',
  '曹真': 'Tào Chân', '黄忠': 'Hoàng Trung', '马超': 'Mã Siêu', '貂蝉': 'Điêu Thuyền',
  '董卓': 'Đổng Trác', '袁绍': 'Viên Thiệu', '孙尚香': 'Tôn Thượng Hương', '陆逊': 'Lục Tốn',
  '甘宁': 'Cam Ninh', '大乔': 'Đại Kiều', '小乔': 'Tiểu Kiều', '孙坚': 'Tôn Kiên',
  // ---- factions ----
  '魏': 'Ngụy', '蜀': 'Thục', '吴': 'Ngô', '群': 'Quần',
  // ---- misc labels / separators / proper nouns ----
  '作者': 'Tác giả', '丨': ' | ', '三幻': 'Tam Huyễn', '三周年': '3 năm', '版本': 'phiên bản',
  '公布': 'công bố', '发布': 'ra mắt', '即将上线': 'sắp ra mắt', '明幽': 'Minh U',
  '御煌': 'Ngự Hoàng', '昭临': 'Chiêu Lâm', '龙章煌彩': 'Long Chương Hoàng Thải',
  '玄冥昭彻': 'Huyền Minh Chiêu Triệt', '锦市千灯': 'Cẩm Thị Thiên Đăng', '戏韵乾坤': 'Hí Vận Càn Khôn',
  // ---- fan handles (Hán-Việt) ----
  '抹布猫': 'Mạt Bố Miêu', '隔壁小伙': 'Cách Bích Tiểu Hỏa', '夏帷听香': 'Hạ Duy Thính Hương',
  '诸君北面': 'Chư Quân Bắc Diện', '兴奋的马喽': 'Hưng Phấn Mã Lâu', '贵妃刷微博': 'Quý Phi Xoát Vi Bác',
  '朕什么都缺': 'Trẫm Thập Ma Đô Khuyết', '疯屋kazaya': 'Phong Ốc kazaya', '悬月kazaya': 'Huyền Nguyệt kazaya',
  'Antia花与御': 'Antia Hoa Dữ Ngự', '老何_超级曹魏人版': 'Lão Hà_Siêu Cấp Tào Ngụy Nhân Bản',
  '嘉彧床底感受床榻小衿灵': 'Gia Úc Sàng Để Cảm Thụ Sàng Tháp Tiểu Khâm Linh',
  // ---- planning comic titles ----
  '003  诸葛果与预言': '003  Gia Cát Quả và lời tiên tri',
  '004  转动命运的初见': '004  Lần gặp đầu xoay chuyển vận mệnh',
  '005  青龙消失于风雨': '005  Thanh Long biến mất trong mưa gió',
  '001  桃园~梦启程之地': '001  Vườn đào ~ vùng đất khởi đầu giấc mơ',
  '006  星斗明亮，世事有果': '006  Sao trời sáng tỏ, sự đời có quả',
  '002  热热闹闹！关关耍刀！': '002  Tưng bừng náo nhiệt! Quan Quan múa đao!',
  '前往BiliBili观看完整剧集 >>': 'Tới BiliBili xem trọn bộ phim >>',
  // ---- person skill (short) ----
  '音焰：攻击敌方单体，造成100%伤害': 'Âm Diễm: Tấn công đơn thể địch, gây 100% sát thương',
  // ---- treasure video titles (keep trailing .mp4) ----
  '来与文姬相约花田，共诉心事！.mp4': 'Cùng Văn Cơ hẹn nơi ruộng hoa, chung lời tâm sự!.mp4',
  '瀚雪张辽守护誓言，融雪记忆 疾风依旧！.mp4': 'Hãn Tuyết Trương Liêu gìn giữ lời thề, ký ức tan tuyết, cuồng phong như cũ!.mp4',
  '瀚雪归乡，花灯团圆，三幻与你相约兔年春节！.mp4': 'Hãn Tuyết về quê, đèn hoa đoàn viên, Tam Huyễn hẹn bạn Tết năm Thỏ!.mp4',
  '不忍了，直接发疯！新魂将诳诡司马懿PV发布！.mp4': 'Không nhịn nữa, phát điên luôn! PV Hồn Tướng mới Cuồng Quỷ Tư Mã Ý ra mắt!.mp4',
  '昙华一现，忘川还生！三周年明幽貂蝉PV发布！.mp4': 'Đàm hoa thoáng nở, Vong Xuyên hồi sinh! PV Minh U Điêu Thuyền kỷ niệm 3 năm ra mắt!.mp4',
  '「蝶乐祈舞」三周年明幽貂蝉主题舞蹈MV公布！.mp4': '「Điệp Lạc Kỳ Vũ」MV vũ đạo chủ đề Minh U Điêu Thuyền kỷ niệm 3 năm công bố!.mp4',
  '「但求江山仁义在」全新魂将“凛煜刘备”PV公布.mp4': '「Chỉ mong giang sơn còn nhân nghĩa」PV Hồn Tướng mới “Lẫm Dục Lưu Bị” công bố.mp4',
  '无人岛“泳装应援大作战”！三幻夏日活动清凉开启.mp4': 'Đảo hoang “Đại chiến cổ vũ đồ bơi”! Sự kiện mùa hè Tam Huyễn mát mẻ mở màn.mp4',
  '「我想继续舞下去，不惜一切。」三周年版本PV公布！.mp4': '「Tôi muốn múa tiếp, bất chấp tất cả.」PV phiên bản kỷ niệm 3 năm công bố!.mp4',
  '“雅瓷琳琅”系列皮肤上架，“航海大冒险”奇幻之旅开启.mp4': '“Nhã Từ Lâm Lang” loạt trang phục lên kệ, “Đại mạo hiểm hàng hải” hành trình kỳ ảo mở màn.mp4',
  '【火凤降世，幻梦燎原】三幻x《火凤燎原》动画版联动正式上线.mp4': '【Hỏa Phượng giáng thế, mộng ảo bừng cháy】Tam Huyễn x《Hỏa Phượng Liệu Nguyên》bản hoạt hình liên động chính thức ra mắt.mp4',
  '「霸王如火，驱寒迎春」煊明孙策PV公布！孙策将以滚烫的意志，守护你的征程！.mp4': '「Bá vương như lửa, xua lạnh đón xuân」PV Huyên Minh Tôn Sách công bố! Tôn Sách sẽ dùng ý chí rực cháy gìn giữ hành trình của bạn!.mp4',
  // ---- news event titles ----
  '活动预告丨年度购物节“锦市千灯”活动来袭！': 'Dự báo sự kiện | Lễ hội mua sắm thường niên “Cẩm Thị Thiên Đăng” đổ bộ!',
  '活动预告丨国庆新版本上线，全新活动“戏韵乾坤”来袭！': 'Dự báo sự kiện | Quốc khánh phiên bản mới ra mắt, sự kiện hoàn toàn mới “Hí Vận Càn Khôn” đổ bộ!',
  '活动预告丨御煌孙权即将上线 全新魂将活动“龙章煌彩”明日开启！': 'Dự báo sự kiện | Ngự Hoàng Tôn Quyền sắp ra mắt, sự kiện Hồn Tướng mới “Long Chương Hoàng Thải” mở vào ngày mai!',
  '活动预告丨昭临曹丕即将上线 全新魂将活动“玄冥昭彻”明日开启！': 'Dự báo sự kiện | Chiêu Lâm Tào Phi sắp ra mắt, sự kiện Hồn Tướng mới “Huyền Minh Chiêu Triệt” mở vào ngày mai!',
  '【官方公告】 活动预告丨御煌孙权即将上线 全新魂将活动“龙章煌彩”明日开启！': '【Thông báo chính thức】 Dự báo sự kiện | Ngự Hoàng Tôn Quyền sắp ra mắt, sự kiện Hồn Tướng mới “Long Chương Hoàng Thải” mở vào ngày mai!',
  // ---- news titles: 新闻 (322) ----
  '三幻五周年丨五周年庆典6月21日开启 版本内容抢先看！': 'Tam Huyễn 5 năm | Đại lễ kỷ niệm 5 năm khai mở ngày 21/6, xem trước nội dung phiên bản!',
  '新版本速报丨翊宁吕玲绮居然在昆仑山沉迷打坐？新版本内容抢先看': 'Tin nhanh phiên bản mới | Dực Ninh Lữ Linh Khởi lại mải mê thiền tọa ở núi Côn Lôn? Xem trước nội dung phiên bản mới',
  '新春版本速报丨天地焕彩 春生万物！乙巳新春版本即将开启~': 'Tin nhanh phiên bản Tân Xuân | Đất trời rạng rỡ, xuân sinh vạn vật! Phiên bản Tân Xuân Ất Tỵ sắp khai mở~',
  '新版本速报丨昭珩陆逊携一年一度“超级折扣季·百衣补贴”火热来袭！': 'Tin nhanh phiên bản mới | Chiêu Hành Lục Tốn mang theo “Mùa giảm giá cực sốc·trợ giá trăm trang phục” thường niên đổ bộ nóng bỏng!',
  // ---- news titles: 公告 (323) ----
  'VIVO平台停止联运公告': 'Thông báo ngừng vận hành chung nền tảng VIVO',
  '猛男幻想服，服务器福利抢先看！': 'Server Mãnh Nam Huyễn Tưởng, xem trước phúc lợi máy chủ!',
  '幻想新战区军团挑战赛来袭！集结争锋，瓜分上千月卡！': 'Giải thách đấu quân đoàn chiến khu mới Huyễn Tưởng đổ bộ! Tập kết tranh phong, chia nhau hàng nghìn thẻ tháng!',
  '新版本速报丨磐极曹仁即将上线 版本内容抢先看！': 'Tin nhanh phiên bản mới | Bàn Cực Tào Nhân sắp ra mắt, xem trước nội dung phiên bản!',
  // ---- person bio + skills (segmented; engine sorts longest-first so these win) ----
  '江东贵族之后，少年时与孙策交好，孙坚死后随着孙策征战江东，立下汗马功劳，时任大都督。孙策死后，在坟前枯坐三日茶饭不思。之后辅佐孙权，与刘备军联合在赤壁大破曹军百万雄师，奠定天下三分格局。': 'Hậu duệ quý tộc Giang Đông, thuở niên thiếu thân với Tôn Sách; sau khi Tôn Kiên mất thì theo Tôn Sách chinh chiến Giang Đông, lập nhiều công lao, giữ chức Đại Đô Đốc. Sau khi Tôn Sách mất, ngồi lặng trước mộ ba ngày bỏ ăn bỏ uống. Về sau phò tá Tôn Quyền, liên minh với quân Lưu Bị đại phá trăm vạn hùng binh Tào quân ở Xích Bích, định nên thế chân vạc thiên hạ.',
  '赤壁灾炎爆：对敌方全体造成84%的法术伤害，若敌方有任意单位处于【灼烧】状态，随机引爆敌方全体每个目标1个【灼烧】状态，将伤害一次性扣除，释放技能后，有50%概率为敌方全体施加【灼烧】状态，持续2回合': 'Xích Bích Tai Viêm Bạo: Gây 84% sát thương phép lên toàn bộ địch; nếu địch có bất kỳ đơn vị nào ở trạng thái 【Thiêu đốt】, ngẫu nhiên kích nổ 1 trạng thái 【Thiêu đốt】 trên mỗi mục tiêu toàn phe địch và trừ sát thương một lần; sau khi thi triển kỹ năng, có 50% xác suất áp 【Thiêu đốt】 lên toàn bộ địch, kéo dài 2 lượt',
  '三星-神火延绵：每个单位行动后，若【灼烧】状态持续时间结束或被驱散时，则蔓延到随意一个相邻单位身上，每次触发蔓延效果后，周瑜回复50点怒气': 'Tam tinh-Thần Hỏa Diên Miên: Sau khi mỗi đơn vị hành động, nếu trạng thái 【Thiêu đốt】 hết thời gian hoặc bị xua tan thì lan sang một đơn vị liền kề bất kỳ; mỗi lần kích hoạt hiệu ứng lan, Chu Du hồi 50 điểm nộ khí',
  '五星-烈焰焚天：使所有【灼烧】效果造成的伤害提升50%；使敌方处于【灼烧】状态的单位最终伤害下降20%': 'Ngũ tinh-Liệt Diễm Phần Thiên: Tăng 50% sát thương do mọi hiệu ứng 【Thiêu đốt】 gây ra; giảm 20% sát thương cuối của đơn vị địch đang ở trạng thái 【Thiêu đốt】',
  '觉醒+1：自身生命值第一次低于50%时，敌方每有1人处于灼烧状态，自身回复50点怒气值': 'Giác tỉnh+1: Khi sinh lực bản thân lần đầu xuống dưới 50%, cứ mỗi 1 địch ở trạng thái Thiêu đốt thì bản thân hồi 50 điểm nộ khí',
  '觉醒+3：自身生命值第一次低于50%时，敌方每有1人处于灼烧状态，自身回复100点怒气值': 'Giác tỉnh+3: Khi sinh lực bản thân lần đầu xuống dưới 50%, cứ mỗi 1 địch ở trạng thái Thiêu đốt thì bản thân hồi 100 điểm nộ khí',
  '觉醒+5：怒气攻击后，使每个被引爆灼烧状态的敌方单位防御下降20%，持续2回合': 'Giác tỉnh+5: Sau đòn nộ khí, giảm 20% phòng thủ mỗi đơn vị địch bị kích nổ trạng thái Thiêu đốt, kéo dài 2 lượt',
};

// merge hero-codex content dictionary (kept in a separate file to keep this one lean)
Object.assign(DICT, CODEX_DICT);
Object.assign(DICT, BIOS_DICT);
Object.assign(DICT, BIOS2_DICT);

const TAB_TITLE = '3Q Đại Chiến - Main';

const SHIM_JS = `(function(){
  var D=${JSON.stringify(DICT)};
  var TT=${JSON.stringify(TAB_TITLE)};
  var K=Object.keys(D).sort(function(a,b){return b.length-a.length;});
  var HAN=/[\\u4e00-\\u9fff]/;
  function tr(s){ if(!s||!HAN.test(s))return s; var o=s;
    for(var i=0;i<K.length;i++){ if(o.indexOf(K[i])>-1)o=o.split(K[i]).join(' '+D[K[i]]+' '); }
    o=o.replace(/([0-9%])([A-Za-zÀ-ỹ])/g,'$1 $2').replace(/([A-Za-zÀ-ỹ])([0-9])/g,'$1 $2');
    o=o.replace(/ {2,}/g,' ').replace(/ +([,.;:%)）】\\]])/g,'$1').replace(/([(（【\\[-]) +/g,'$1').replace(/ +$/,'').replace(/^ +/,'');
    return o; }
  function fixNode(n){ if(n&&n.nodeValue&&HAN.test(n.nodeValue)){ var v=tr(n.nodeValue); if(v!==n.nodeValue)n.nodeValue=v; } }
  function walk(root){ try{ if(!root)return; if(root.nodeType===3){fixNode(root);return;} var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,b=[]; while((n=w.nextNode()))b.push(n); for(var i=0;i<b.length;i++)fixNode(b[i]); }catch(e){} }
  function run(){ walk(document.body); }
  if(document.readyState!=='loading')run(); else document.addEventListener('DOMContentLoaded',run);
  var mo=new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i]; if(m.type==='characterData'){fixNode(m.target);} else if(m.addedNodes){ for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j]); } } });
  (function start(){ if(document.body)mo.observe(document.body,{childList:true,subtree:true,characterData:true}); else setTimeout(start,50); })();
  var c=0,iv=setInterval(function(){run(); if(++c>24)clearInterval(iv);},500);
  setInterval(run,1000); // permanent slow sweep — re-translate after late re-renders (e.g. fans gallery)
})();`;

// Ellipsis/clamp so Vietnamese (often longer than zh) never breaks the layout.
const ELLIPSIS_CSS = `
.star-site-news-list-content__tiltle,.star-site-news-list-content__type,
.star-site-person-advance-skills-name,
.star-site-planning-content__kv-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.star-site-person-introduction-text{display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;}
.star-site-person-advance-skills-describe{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.star-site-news-list-hot{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.star-site-main-left-navs__item a,.star-site-main-left-navs__item span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;}
/* CV hero name: keep the original vertical top-down "seal" stack (one CJK char per line),
   but for VN stack one SYLLABLE per line (Gia/Cát/Lượng) instead of breaking mid-word.
   width:min-content → each space-separated syllable drops to its own line; shrink font. */
.star-site-person-cv-general_name,.star-site-person-cv-general_name__3{font-size:8vh!important;width:min-content!important;letter-spacing:normal!important;word-break:keep-all!important;white-space:normal!important;line-height:1.05!important;text-align:center;}`;

export const I18N_HTML = `<style data-mirror-ellipsis>${ELLIPSIS_CSS}</style><script data-mirror-i18n="zh-vi">${SHIM_JS}</script>`;
