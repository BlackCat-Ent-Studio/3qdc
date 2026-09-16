// layout-v2.mjs — omg3q-style scrolling layout for the build-B home route (#/index).
// Additive overlay: restyles the existing React DOM (logo, 10 image nav items), builds its own download panel and
// sidebar (Vietnamese buttons, no links until the site has its own), and appends sections below the key visual.
// The umi bundle and mirror/ are never edited; the original download bar is hidden, its links are not reused.
//
// Build B serves /home and every /main-family path from one entry, and index <->
// main navigation is hash-based, so the layout is gated at runtime: it is active
// only while location.hash is empty or #/index, and fully torn down otherwise.
//
// Sections (news, heroes, features, treasure) register through window.__hv2 and
// stay hidden until they have rendered content, so no empty shell is ever shown.
// The treasure section is currently switched off (see SHOW_TREASURE).

import { NEWS_CSS, NEWS_JS } from './section-news.mjs';
import { HEROES_CSS, HEROES_JS } from './section-heroes.mjs';
import { FEATURES_CSS, FEATURES_JS } from './section-features.mjs';
import { TREASURE_CSS, TREASURE_JS } from './section-treasure.mjs';
import { HERO_SKILLS_CSS, HERO_SKILLS_JS } from './embed-hero-skills.mjs';
import { HEROES_MOBILE_CSS, HEROES_MOBILE_JS } from './section-heroes-mobile.mjs';
import { COMPACT_MQ, COMPACT_HEADER_H } from './compact.mjs';

const HEADER_H = 88;
// the blurred header background runs this far down, fading out below the 88px bar
const HEADER_FADE = HEADER_H + 36;
// vertical centre of the header logo: the centre of the painted menu art row (the logo overhangs the 88px bar a little,
// inside the blurred background)
const LOGO_CENTER = 56;

// Phones, touch tablets and narrow windows (COMPACT_MQ, see compact.mjs) get the compact layout: a 56px header
// with the logo and a menu button, the whole key art at its own ratio under the header, the download panel below it, the
// sections in one column and the social icons as a row at the end of the page. Every compact rule sits inside COMPACT_MQ,
// so wider windows keep the desktop layout exactly as it is.

// Key-visual background: the Vietnamese artwork served from overrides/home (KV_IMAGE), replacing the original
// page_642a4eb04023f80ab7f3fb17/mqaggnekipux19ptb5s.jpg; cover-scaled, top-aligned. Natural size and the bottom
// edge of the event banner frame baked into the art, in image pixels (the frame's lower gold border is rows 782-783).
// The download panel starts just below that frame so no text of the art is covered. Update these if the home
// background artwork is replaced (the original art was 2560x1306 with eventFrameBottom 1140).
const KV_IMAGE = '/3qdc-vi/home/anh-nen-slogan-vi.webp';
const KV = { width: 1756, height: 896, eventFrameBottom: 785 };

// Vietnamese download buttons (omg3q-style artwork in overrides/home) in display order, filling a 2-column grid row by
// row. The site has no links of its own yet: an entry without `href` is shown in place but not clickable; give it the
// 3qdc URL to make it a link (opens in a new tab). The original Chinese download links of the app are not used.
const DL_ART = [
  { href: null, src: '/3qdc-vi/home/nut-tai-appstore.png', label: 'Tải trên App Store' },
  { href: null, src: '/3qdc-vi/home/nut-tai-file-apk.png', label: 'Tải file APK' },
  { href: null, src: '/3qdc-vi/home/nut-tai-google-play.png', label: 'Tải trên Google Play' },
  { href: null, src: '/3qdc-vi/home/nut-dang-ky-nhanh.png', label: 'Đăng ký nhanh' },
];
const DL_TOPUP = '/3qdc-vi/home/nut-nap-the.webp';
// the site's own download QR (200x200, decorated; links to the download-links article through q.me-qr.com), shown in the
// download panel and the right sidebar instead of the original Chinese QR
const QR_IMAGE = '/3qdc-vi/home/qr-3qdc.png';
// The "NẠP THẺ" top-up box of the download panel and the right sidebar is switched off for now (2026-09-16): while
// false neither box is built, so the panel is narrower and the sidebar (~435px instead of ~576px) stays full size and
// centred down to laptop-height windows. To bring the box back: set this to true and restart the service.
const SHOW_TOPUP = false;
// below this window height the sidebar uses its compact form (anchored under the header) so it never covers the header:
// full size inside the cloud frame is ~435px (~576px with the top-up box), plus the 88px header above and below
const SIDEBAR_COMPACT_H = SHOW_TOPUP ? 760 : 620;
// sidebar collapse arrow (omg3q floating-bar artwork, 86x58 strip): ">" (collapse) at 0 0, "<" (expand) at -44px 0
const SB_TOGGLE = '/3qdc-vi/home/sidebar-toggle.png';

// Left social bar on the home page, top to bottom. [id, label, link, Simple Icons path (CC0, 24x24 viewBox)]. A null link
// means 3qdc has no such page yet: the icon is shown but not clickable; put the URL in to make it open in a new tab.
const SOCIAL = [
  ['zalo', 'Zalo', null, 'M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z'],
  ['facebook', 'Facebook', null, 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z'],
  ['discord', 'Discord', null, 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z'],
  ['tiktok', 'TikTok', null, 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'],
  ['youtube', 'YouTube', null, 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'],
];
// each logo is drawn in cream on the owner's round badge (overrides/home/mxh-huy-hieu.webp, 318x336 = the 56x59 shown at
// about 6x; red gem on top, so the plain inner circle sits a little below the middle: centre at 49.9% / 52.9%)
const SOCIAL_BADGE = '/3qdc-vi/home/mxh-huy-hieu.webp';
// the bar sits in the owner's navy frame with gold cloud corners (overrides/home/khung-mxh-may.webp, 320x937), drawn as a
// 9-slice border image: the four cloud corners (the clouds reach 118px in) keep their shape, only the straight edges and
// the navy middle stretch with the bar's height. Chrome leaves a faint dark hairline where the slices meet, so each bar
// also gets a plain navy background of the frame's colour (rounded wider than the frame's ~21px corner, so it stays inside the gold line) that hides it. Drawn at 0.275x
// (122/124 x 0.275) on both the 88px social bar and the right download sidebar, so the two bars have the same clouds and
// gold line
const SOCIAL_FRAME = '/3qdc-vi/home/khung-mxh-may.webp';
const socialSvg = (d) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff3d6" d="${d}"/></svg>`)}")`;

// "Kho Báu" is hidden for now (2026-09-15): the feature will not be used for a long time. While false the home
// page builds no treasure block (so no CG / wallpaper requests) and hides the treasure item of the header image
// nav; server.mjs imports this flag and redirects /kho-bau to /home while it is false.
// section-treasure.mjs is kept unchanged. To bring the feature back: set this to true and restart the service.
export const SHOW_TREASURE = false;

// header nav on the home page: only these items stay, drawn with the Vietnamese menu art from overrides/home
// (normal 41px / hover 79px high, transparent right margin trimmed). Clicking scrolls to the section on this page
// instead of leaving it; a null section means the top of the page. [app href, section id, image base name, label]
const NAV_VI = [
  ['#/index', null, 'menu-01-trang-chu', 'Trang chủ'],
  ['#/main/news', 'hv2-news', 'menu-02-tin-tuc', 'Tin tức'],
  ['#/main/person', 'hv2-heroes', 'menu-04-tuong', 'Tướng'],
  ['#/main/feature', 'hv2-features', 'menu-05-dac-sac', 'Đặc sắc'],
];
const NAV_KEEP = NAV_VI.map(([href]) => `:has(> a[href="${href}"])`).join(',');
// image heights: the hover art is 1.626x the normal art so both titles render at the same size; its title starts
// at x=64/79 against x=18/41 in the normal art, hence the left shift of 0.8815 normal heights
// (1.75x the first size: the art is only 41 / 79px tall, so it is drawn upscaled)
const NAV_H = 'clamp(66.5px,4.9vw,94.5px)';
const NAV_HOVER_H = 'clamp(108.5px,8.015vw,154px)';

// treasure hidden: drop its item from the header image nav; the remaining items stay centred in the row
const TREASURE_OFF_CSS = `
html.hv2 .star-site-index-navs__item:has(> a[href="#/main/treasure"]){display:none!important}
`;

const CSS = `
html.hv2 body{overflow-x:hidden}

/* hero page embedded in the home "Hệ Thống Tướng" block: hide its left navigation so the hero layout spans the frame */
html.hv2-embed .star-site-main-left{display:none!important}
html.hv2-embed .star-site-main-right{margin-left:0!important;width:100%!important}
html.hv2{--hv2-dl-btn:clamp(34px,2.5vw,46px)}
html.hv2 .star-site-index-left-mask{display:none!important}

/* Vietnamese key visual. The app sets the original art as an inline background on the index route's element;
   keyed on .star-site-index (present only on #/index) rather than html.hv2, which is added at DOMContentLoaded,
   so the original art is never fetched or flashed first */
.star-site-index .star-site-imgBg{background-image:url("${KV_IMAGE}")!important}

/* header background behind the fixed logo / nav: the page under it is blurred heavily at the top, less further down,
   and is sharp again a little below the bar (no hard bottom edge). Each stacked .hv2-hb layer blurs a band that ends
   lower as its radius gets smaller. The parent must not get filter / opacity / backdrop-filter: that would change the
   layers' backdrop root and they would blur nothing. */
#hv2-header-bg{display:none}
html.hv2 #hv2-header-bg{display:block;position:fixed;top:0;left:0;right:0;height:${HEADER_FADE}px;z-index:9;
  background:linear-gradient(180deg,rgba(6,8,18,.55) 0,rgba(6,8,18,.32) ${HEADER_H}px,rgba(6,8,18,0) ${HEADER_FADE}px);
  pointer-events:none}
#hv2-header-bg .hv2-hb{position:absolute;top:0;left:0;right:0;height:100%}
#hv2-header-bg .hv2-hb-1{-webkit-backdrop-filter:blur(1.5px);backdrop-filter:blur(1.5px);
  -webkit-mask-image:linear-gradient(180deg,#000 100px,transparent ${HEADER_FADE}px);mask-image:linear-gradient(180deg,#000 100px,transparent ${HEADER_FADE}px)}
#hv2-header-bg .hv2-hb-2{-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  -webkit-mask-image:linear-gradient(180deg,#000 76px,transparent 108px);mask-image:linear-gradient(180deg,#000 76px,transparent 108px)}
#hv2-header-bg .hv2-hb-3{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  -webkit-mask-image:linear-gradient(180deg,#000 48px,transparent 88px);mask-image:linear-gradient(180deg,#000 48px,transparent 88px)}
#hv2-header-bg .hv2-hb-4{-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
  -webkit-mask-image:linear-gradient(180deg,#000 20px,transparent 64px);mask-image:linear-gradient(180deg,#000 20px,transparent 64px)}

/* logo, badge and nav scale with viewport width so the row fits 1366px laptops. The logo is centred on the painted menu
   row (diamond + title + subtitle, centre 55–57px at 1920–1366), not on the 88px bar, so it does not hug the top edge */
html.hv2 .star-site-index-logo{position:fixed!important;top:${LOGO_CENTER}px!important;left:24px!important;
  width:auto!important;height:clamp(56px,4vw,76px)!important;transform:translateY(-50%);z-index:11!important}
/* the "App Store 精选推荐 / TapTap 热门榜第一" badge (one image) is not shown on the home header */
html.hv2 .star-site-index-beishu{display:none!important}

/* image nav: vertical list -> centered horizontal row, reduced to the NAV_VI items. The row is as tall as the blurred
   header background (not the 88px bar) so the large menu art is not cut at the top */
html.hv2 .star-site-index-navs{position:fixed!important;top:0!important;left:clamp(170px,13.5vw,260px)!important;
  right:clamp(200px,15.6vw,300px)!important;height:${HEADER_FADE}px!important;display:flex!important;
  flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:clamp(18px,2.4vw,46px);
  transform:none!important;animation:none!important;filter:none!important;opacity:1!important;z-index:11!important;
  margin:0!important;padding:0!important}
html.hv2 .star-site-index-navs__item{width:auto!important;height:${HEADER_FADE}px!important;margin:0!important;
  padding:0 clamp(2px,.3vw,8px)!important;justify-content:center}
html.hv2 .star-site-index-navs__item:before{display:none!important}
/* items outside NAV_VI: hidden by CSS before the script runs, and by the class it sets. Two separate rules: a
   browser without :has drops the whole :has rule, and the class rule must survive that */
html.hv2 .star-site-index-navs__item.hv2-nav-off{display:none!important}
html.hv2 .star-site-index-navs__item:not(${NAV_KEEP}){display:none!important}
html.hv2 .star-site-index-navs__item > a{position:relative;display:flex;align-items:center;height:100%}
/* keep the normal image in flow (stable width), swap to the hover art on top of it. Hover only: the app always
   marks Trang chủ active, and the original active style would pin it on the hover art */
html.hv2 .star-site-index-navs__item-img{display:block!important;height:${NAV_H}!important;width:auto!important}
html.hv2 .star-site-index-navs__item-img_hover{display:none!important;position:absolute;left:0;top:50%;
  height:${NAV_HOVER_H}!important;width:auto!important;margin:0!important;transform:translate(calc(${NAV_H} * -0.8815),-50%)}
html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img{visibility:hidden}
html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img_hover{display:block!important}

/* the original download bar carries the app's Chinese download and shop links: never shown on the home route (keyed on
   .star-site-index, present from the first render, like the background rule); the panel only copies its QR and caption */
.star-site-index .star-site-index-download{display:none!important}

/* download panel (omg3q style): QR | 2x2 Vietnamese buttons | top-up box, starting just below the event banner
   frame of the background art (top comes from --hv2-dl-top computed in JS), below the header layers */
#hv2-dlpanel{display:none}
html.hv2 #hv2-dlpanel{display:flex;align-items:center;gap:clamp(14px,1.3vw,24px);position:absolute;left:50%;
  top:var(--hv2-dl-top,auto);z-index:8;transform:translateX(-50%);box-sizing:border-box;
  padding:clamp(10px,.8vw,14px) clamp(16px,1.5vw,28px);border:2px solid rgba(214,176,106,.8);border-radius:16px;
  background:linear-gradient(180deg,rgba(30,37,84,.95),rgba(13,17,42,.95));
  box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.06)}
#hv2-dlpanel .hv2-dl-qr{display:flex;flex-direction:column;align-items:center;gap:4px}
#hv2-dlpanel .hv2-dl-qr-img{width:calc(var(--hv2-dl-btn) * 2 + 8px);aspect-ratio:1;padding:4px;box-sizing:border-box;
  background:#fff;border-radius:8px}
#hv2-dlpanel .hv2-dl-qr-img img{display:block;width:100%!important;height:100%!important}
#hv2-dlpanel .hv2-dl-qr-text{color:#e9d9b0;font-size:12px;line-height:1.2;white-space:nowrap}
#hv2-dlpanel .hv2-dl-grid{display:grid;grid-template-columns:repeat(2,auto);gap:8px}
#hv2-dlpanel .hv2-dl-grid a{display:block;line-height:0}
#hv2-dlpanel .hv2-dl-grid img{display:block;width:auto!important;height:var(--hv2-dl-btn)!important}
/* top-up link as the Vietnamese "NẠP THẺ" box (131x150 art): two button rows tall plus the 18px it rises above them */
#hv2-dlpanel a.star-site-index-store{display:block;margin:-18px 0 0!important;
  background-image:url("${DL_TOPUP}")!important;background-size:100% 100%!important;
  height:calc(var(--hv2-dl-btn) * 2 + 26px)!important;width:calc((var(--hv2-dl-btn) * 2 + 26px) * 0.8733)!important}
/* buttons, top-up box and section items look and react like real buttons even without a link yet (hand cursor, hover),
   so the owner can try each one; a click leads nowhere until its link is filled in */
#hv2-dlpanel a,#hv2-sidebar a,#home-v2 a{cursor:pointer}
#hv2-dlpanel a:hover,#hv2-sidebar a:hover{filter:brightness(1.1)}

/* right sidebar (cloned QR, Vietnamese download buttons, top-up box): slides in once the key visual (and its download panel)
   is scrolled past; drawn in the cloud frame (SOCIAL_FRAME) like the left social bar, padded clear of the corner clouds */
#hv2-sidebar{display:none}
html.hv2 #hv2-sidebar{display:flex;flex-direction:column;align-items:center;gap:8px;position:fixed;right:14px;top:50%;
  transform:translate(calc(100% + 24px),-50%);opacity:0;pointer-events:none;transition:transform .3s ease,opacity .3s ease;
  z-index:12;width:152px;padding:36px 12px;box-sizing:border-box;
  border:0 solid transparent;border-image:url("${SOCIAL_FRAME}") 122 124 122 fill / 33.5px 34px 33.5px stretch;
  border-radius:24px;background:#16273b;
  filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))}
html.hv2.hv2-scrolled #hv2-sidebar{transform:translate(0,-50%);opacity:1;pointer-events:auto}
#hv2-sidebar .hv2-qr{width:112px;height:112px;background:#fff;border-radius:6px;padding:4px;box-sizing:border-box}
#hv2-sidebar .hv2-qr img{width:100%!important;height:100%!important;display:block}
#hv2-sidebar .hv2-qr-text{color:#e9d9b0;font-size:12px;line-height:1.3;text-align:center}
#hv2-sidebar a{display:block;line-height:0}
#hv2-sidebar a img{width:128px!important;height:auto!important}
#hv2-sidebar a.star-site-index-store{width:112px!important;height:128px!important;margin:2px auto 0!important;
  background-image:url("${DL_TOPUP}")!important;background-size:100% 100%!important}
#hv2-sidebar .hv2-top{margin-top:2px;width:128px;height:30px;border:1px solid rgba(214,176,106,.7);border-radius:6px;
  background:transparent;color:#e9d9b0;font-size:13px;cursor:pointer}
#hv2-sidebar .hv2-top:hover{background:rgba(214,176,106,.18)}
/* short windows: the centred full-size sidebar (~576px with the top-up box, ~435px without) would run over the fixed
   header, so use a compact sidebar (~470px / ~366px) anchored just below the header instead (see SIDEBAR_COMPACT_H) */
@media (max-height:${SIDEBAR_COMPACT_H}px){
  html.hv2 #hv2-sidebar{top:96px;gap:6px;padding:36px 12px;transform:translate(calc(100% + 24px),0)}
  html.hv2.hv2-scrolled #hv2-sidebar{transform:translate(0,0)}
  #hv2-sidebar .hv2-qr{width:88px;height:88px}
  #hv2-sidebar a img{width:104px!important}
  #hv2-sidebar a.star-site-index-store{width:88px!important;height:101px!important}
  #hv2-sidebar .hv2-top{width:104px;height:26px}
}

/* collapse/expand arrow on the sidebar's left edge; collapsed, the sidebar slides off screen and only the arrow stays */
#hv2-sidebar .hv2-sb-toggle{position:absolute;left:-43px;top:50%;width:42px;height:58px;margin-top:-29px;padding:0;border:0;
  background:url("${SB_TOGGLE}") 0 0 no-repeat;cursor:pointer}
#hv2-sidebar .hv2-sb-toggle:hover{filter:brightness(1.1)}
html.hv2-sb-collapsed #hv2-sidebar .hv2-sb-toggle{background-position:-44px 0}
html.hv2.hv2-scrolled.hv2-sb-collapsed #hv2-sidebar{transform:translate(calc(100% + 14px),-50%)}
@media (max-height:${SIDEBAR_COMPACT_H}px){
  html.hv2.hv2-scrolled.hv2-sb-collapsed #hv2-sidebar{transform:translate(calc(100% + 14px),0)}
}

/* left social bar (SOCIAL): shown at the top of the home page, vertically centred like the right sidebar (on laptop-height
   windows its lower edge reaches the top of the slogan in the key visual, accepted), tucked away (arrow only) once the key
   visual is scrolled past (see updateSocial); icons inside the cloud frame (SOCIAL_FRAME), padded clear of the corner
   clouds; the collapse arrow is the sidebar artwork mirrored, on the bar's right edge */
#hv2-social{display:none}
html.hv2 #hv2-social{display:flex;flex-direction:column;align-items:center;gap:10px;position:fixed;left:14px;top:50%;
  transform:translateY(-50%);z-index:12;width:88px;padding:36px 0;box-sizing:border-box;transition:transform .3s ease;
  border:0 solid transparent;border-image:url("${SOCIAL_FRAME}") 122 124 122 fill / 33.5px 34px 33.5px stretch;
  border-radius:24px;background:#16273b;
  filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))}
#hv2-social .hv2-soc-i{display:block;width:56px;height:59px;box-sizing:border-box;
  background-repeat:no-repeat;background-size:22px 22px,100% 100%;background-position:17px 20px,0 0;
  filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
#hv2-social a.hv2-soc-i{cursor:pointer}
#hv2-social a.hv2-soc-i:hover{filter:drop-shadow(0 2px 3px rgba(0,0,0,.5)) brightness(1.15)}
${SOCIAL.map(([id, , , d]) => `#hv2-social .hv2-soc-${id}{background-image:${socialSvg(d)},url("${SOCIAL_BADGE}")}`).join('\n')}
#hv2-social .hv2-soc-toggle{position:absolute;right:-43px;top:50%;width:42px;height:58px;margin-top:-29px;padding:0;border:0;
  background:url("${SB_TOGGLE}") 0 0 no-repeat;transform:scaleX(-1);cursor:pointer}
#hv2-social .hv2-soc-toggle:hover{filter:brightness(1.1)}
html.hv2-soc-collapsed #hv2-social{transform:translate(calc(-100% - 14px),-50%)}
html.hv2-soc-collapsed #hv2-social .hv2-soc-toggle{background-position:-44px 0}

/* content area below the key visual */
#home-v2{display:none}
html.hv2 #home-v2{display:block;position:relative;z-index:1;background:#0b0d18;color:#e8e2d0;padding-top:var(--hv2-dl-push,0px);
  font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
#home-v2 .hv2-section{display:none;padding:72px 180px 64px 24px;max-width:1280px;margin:0 auto;box-sizing:content-box}
#home-v2 .hv2-section[data-ready]{display:block}
/* the page has no footer: the last block is at least one window tall below the header row, so the header menu can
   still scroll it up to the header on tall windows (136px = the block's 72px top + 64px bottom padding) */
#home-v2 .hv2-section:last-of-type{min-height:calc(100vh - ${HEADER_H}px - 136px)}
#home-v2 .hv2-title{margin:0 0 36px;text-align:center;font-size:40px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;color:#f3dfa6;text-shadow:0 2px 0 #6b3a14,0 0 22px rgba(243,197,106,.35)}
#hv2-menu-btn{display:none}

/* ---- compact layout (phones, touch tablets, narrow windows): see compact.mjs ---- */
@media ${COMPACT_MQ}{
  html.hv2,html.hv2 body{overflow-x:hidden;overflow-x:clip}
  /* header: a 56px bar (one blur layer, darker so the page never shows through the logo and menu button) */
  html.hv2 #hv2-header-bg{height:${COMPACT_HEADER_H}px;background:rgba(6,8,18,.82);
    -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid rgba(214,176,106,.25)}
  #hv2-header-bg .hv2-hb{display:none}
  html.hv2 .star-site-index-logo{top:${COMPACT_HEADER_H / 2}px!important;left:max(12px,env(safe-area-inset-left))!important;height:44px!important}
  html.hv2 #hv2-menu-btn{display:flex;align-items:center;justify-content:center;position:fixed;z-index:13;
    top:${(COMPACT_HEADER_H - 44) / 2}px;right:max(8px,env(safe-area-inset-right));width:44px;height:44px;padding:0;
    border:1px solid rgba(214,176,106,.6);border-radius:10px;background:rgba(20,22,40,.9);cursor:pointer}
  #hv2-menu-btn span,#hv2-menu-btn span:before,#hv2-menu-btn span:after{display:block;position:relative;width:20px;height:2px;
    border-radius:1px;background:#f3dfa6;transition:transform .2s ease,background .2s ease}
  #hv2-menu-btn span:before,#hv2-menu-btn span:after{content:"";position:absolute;left:0}
  #hv2-menu-btn span:before{top:-6px}
  #hv2-menu-btn span:after{top:6px}
  html.hv2-menu-open #hv2-menu-btn span{background:transparent}
  html.hv2-menu-open #hv2-menu-btn span:before{transform:translateY(6px) rotate(45deg)}
  html.hv2-menu-open #hv2-menu-btn span:after{transform:translateY(-6px) rotate(-45deg)}
  /* the image menu becomes a drop-down list under the bar, opened by the menu button */
  html.hv2 .star-site-index-navs{top:${COMPACT_HEADER_H}px!important;left:0!important;right:0!important;height:auto!important;
    display:none!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:0;
    padding:6px 0 10px!important;background:#080a16!important;border-bottom:1px solid rgba(214,176,106,.35);
    box-shadow:0 14px 30px rgba(0,0,0,.5);max-height:calc(100vh - ${COMPACT_HEADER_H}px);overflow-y:auto}
  html.hv2.hv2-menu-open .star-site-index-navs{display:flex!important}
  html.hv2 .star-site-index-navs__item{height:64px!important;padding:0 max(20px,env(safe-area-inset-left))!important;
    border-bottom:1px solid rgba(214,176,106,.12)}
  html.hv2 .star-site-index-navs__item:last-child{border-bottom:0}
  html.hv2 .star-site-index-navs__item > a{width:100%}
  html.hv2 .star-site-index-navs__item-img{height:56px!important}
  html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img{visibility:visible}
  html.hv2 .star-site-index-navs__item-img_hover,html.hv2 .star-site-index-navs__item:hover .star-site-index-navs__item-img_hover{display:none!important}

  /* key art: the whole picture at its own ratio under the bar (the slogan printed in it stays whole); the app's
     decorations of the full-screen desktop art are not used */
  html.hv2 .star-site-index{height:calc(${COMPACT_HEADER_H}px + 100vw * ${KV.height} / ${KV.width})!important;min-height:0!important}
  html.hv2 .star-site-index .star-site-imgBg{top:${COMPACT_HEADER_H}px!important;bottom:auto!important;height:calc(100vw * ${KV.height} / ${KV.width})!important;
    background-size:100% 100%!important;background-position:center top!important}
  html.hv2 .star-site-index-decorate,html.hv2 .star-site-index-slogan{display:none!important}

  /* download panel: full width under the key art, the four buttons in two columns; no QR (a phone cannot scan its own screen) */
  html.hv2 #hv2-dlpanel{left:max(12px,calc(50% - 280px));right:max(12px,calc(50% - 280px));transform:none;display:block;padding:12px;border-radius:14px}
  #hv2-dlpanel .hv2-dl-qr{display:none}
  #hv2-dlpanel .hv2-dl-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:520px;margin:0 auto}
  #hv2-dlpanel .hv2-dl-grid a{display:flex;justify-content:center}
  #hv2-dlpanel .hv2-dl-grid img{width:100%!important;height:auto!important;max-width:240px;aspect-ratio:197/60}
  html.hv2 #hv2-sidebar{display:none!important}
  /* 320px phones: tighter panel so each button stays about 42px tall */
  @media (max-width:359px){
    html.hv2 #hv2-dlpanel{left:8px;right:8px;padding:8px}
    #hv2-dlpanel .hv2-dl-grid{gap:8px}
  }

  /* social icons: a row at the end of the page instead of the floating bar */
  html.hv2 #hv2-social{position:static;flex-direction:row;flex-wrap:wrap;justify-content:center;gap:14px;width:auto;
    transform:none!important;padding:22px 16px calc(22px + env(safe-area-inset-bottom));border:0;border-top:1px solid rgba(214,176,106,.3);
    border-radius:0;box-shadow:none;background:#0b0d18;border-image:none;filter:none}
  #hv2-social .hv2-soc-toggle{display:none}

  /* sections: one column with phone-sized spacing and titles */
  #home-v2 .hv2-section{padding:40px max(16px,env(safe-area-inset-left)) 36px;max-width:720px}
  /* as on desktop, the last block is at least a window tall below the bar (76px = its top + bottom padding), so the menu can
     still bring it up to the bar */
  #home-v2 .hv2-section:last-of-type{min-height:calc(100vh - ${COMPACT_HEADER_H}px - 76px)}
  #home-v2 .hv2-title{margin:0 0 20px;font-size:clamp(24px,6.4vw,32px);letter-spacing:.04em}
}
`;

const JS = `(function(){
  if (window.__hv2) return;
  // inside the home page's hero block (iframe named 'hv2-embed') this page shows only its hero layout:
  // flag it before the app renders so the left navigation never flashes, and never build the home layout
  var EMBED = window.name === 'hv2-embed' && window.top !== window;
  if (EMBED) document.documentElement.classList.add('hv2-embed');
  var SECTIONS = [
    ['hv2-news', 'Tin Tức Sự Kiện'],
    ['hv2-heroes', 'Hệ Thống Tướng'],
    ['hv2-features', 'Tính Năng Đặc Sắc']${SHOW_TREASURE ? `,
    ['hv2-treasure', 'Kho Báu']` : ''}
  ];
  var KV = ${JSON.stringify(KV)};
  var SHOW_TOPUP = ${SHOW_TOPUP};
  var DL_ART = ${JSON.stringify(DL_ART)};
  var renderers = [];
  var mounted = false;
  var sidebarTimer = null;
  var active = false;
  var panelBottom = 0; // document y of the download panel's bottom edge; the sidebar waits until it is scrolled past
  // compact layout (COMPACT_MQ): phones and tablets held upright
  var COMPACT = window.matchMedia ? window.matchMedia(${JSON.stringify(COMPACT_MQ)}) : null;
  function compact(){ return !!(COMPACT && COMPACT.matches); }
  function headerH(){ return compact() ? ${COMPACT_HEADER_H} : ${HEADER_H}; }

  function isHome(){
    if (EMBED) return false;
    var h = location.hash;
    return !h || h === '#' || h === '#/' || h.indexOf('#/index') === 0;
  }
  function el(tag, attrs, kids){
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs){ if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function(c){ if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  // absolute / protocol-relative / root-relative asset URL -> same-origin mirror path
  function local(u){
    if (!u) return '';
    return String(u).replace(/^https?:\\/\\//, '/').replace(/^\\/\\//, '/');
  }
  function snap(file){
    return fetch('/galaxias-api.lingxigames.com/ds/ajax/' + file).then(function(r){
      if (!r.ok) throw new Error('snapshot ' + r.status);
      return r.json();
    });
  }
  function section(id){ return document.getElementById(id); }
  // a section becomes visible only once its renderer has filled it
  function ready(id){ var s = section(id); if (s) s.setAttribute('data-ready', ''); }

  function buildContainer(){
    if (document.getElementById('home-v2')) return;
    var wrap = el('div', { id: 'home-v2', 'data-home-v2': '' });
    SECTIONS.forEach(function(s){
      wrap.appendChild(el('section', { id: s[0], 'class': 'hv2-section' }, [el('h2', { 'class': 'hv2-title', text: s[1] })]));
    });
    document.body.appendChild(wrap);
    var headerBg = el('div', { id: 'hv2-header-bg' });
    for (var i = 1; i <= 4; i++) headerBg.appendChild(el('div', { 'class': 'hv2-hb hv2-hb-' + i }));
    document.body.appendChild(headerBg);
  }

  // Vietnamese download buttons in DL_ART order: a link when the entry has an href, otherwise the artwork shown in
  // place but not clickable (the site has no links of its own yet). The app's original download links are not used.
  function dlLinks(){
    return DL_ART.map(function(art){
      var attrs = { 'aria-label': art.label };
      if (art.href) { attrs.href = art.href; attrs.target = '_blank'; attrs.rel = 'noopener'; }
      else { attrs['class'] = 'hv2-dl-soon'; attrs.role = 'link'; attrs['aria-disabled'] = 'true'; }
      return el('a', attrs, [el('img', { src: art.src, alt: art.label })]);
    });
  }
  // the QR keeps the app's element (sizes come from the panel / sidebar CSS) with the site's own QR picture
  function qrClone(img){
    var q = img.cloneNode(true);
    q.setAttribute('src', '${QR_IMAGE}'); q.removeAttribute('srcset'); q.setAttribute('alt', 'Mã QR tải game 3Q Đại Chiến');
    return q;
  }
  // the top-up box keeps the app's element (its artwork is a CSS background) without the original shop link
  function topupBox(store){
    var box = store.cloneNode(true);
    box.removeAttribute('href'); box.removeAttribute('target');
    box.setAttribute('aria-label', 'Nạp thẻ'); box.setAttribute('role', 'link'); box.setAttribute('aria-disabled', 'true');
    return box;
  }

  // Sidebar collapse state: a class on <html> drives the slide and the arrow direction; the viewer's choice is kept in
  // this browser (localStorage can be unavailable, e.g. blocked storage, so every access is guarded)
  var SB_KEY = 'hv2-sidebar-collapsed';
  function sidebarCollapsedSaved(){ try { return localStorage.getItem(SB_KEY) === '1'; } catch (e) { return false; } }
  function setSidebarCollapsed(on, save){
    document.documentElement.classList.toggle('hv2-sb-collapsed', on);
    var t = document.querySelector('#hv2-sidebar .hv2-sb-toggle');
    if (t){ t.setAttribute('aria-label', on ? 'Mở thanh tải game' : 'Thu gọn thanh tải game'); t.setAttribute('aria-expanded', on ? 'false' : 'true'); }
    if (save){ try { localStorage.setItem(SB_KEY, on ? '1' : '0'); } catch (e) {} }
  }

  function buildSidebar(){
    if (document.getElementById('hv2-sidebar')) return true;
    var dl = document.querySelector('.star-site-index-download');
    var qrImg = document.querySelector('.star-site-index-download-qrcode_box img');
    if (!dl || !qrImg) return false;
    var bar = el('div', { id: 'hv2-sidebar', 'data-home-v2': '' });
    var qr = el('div', { 'class': 'hv2-qr' }); qr.appendChild(qrClone(qrImg));
    bar.appendChild(qr);
    var desc = document.querySelector('.star-site-index-download-qrcode_box p');
    bar.appendChild(el('div', { 'class': 'hv2-qr-text', text: desc ? desc.textContent : '' }));
    dlLinks().forEach(function(a){ bar.appendChild(a); });
    var store = dl.querySelector('a.star-site-index-store');
    if (store && SHOW_TOPUP) bar.appendChild(topupBox(store));
    var top = el('button', { type: 'button', 'class': 'hv2-top', text: 'Lên đầu trang' });
    top.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });
    bar.appendChild(top);
    var toggle = el('button', { type: 'button', 'class': 'hv2-sb-toggle' });
    toggle.addEventListener('click', function(){
      setSidebarCollapsed(!document.documentElement.classList.contains('hv2-sb-collapsed'), true);
    });
    bar.appendChild(toggle);
    document.body.appendChild(bar);
    setSidebarCollapsed(sidebarCollapsedSaved(), false);
    return true;
  }

  // Left social bar: built once from SOCIAL (needs nothing from the app, so it is there from the first paint of the
  // home page). Shown at the top of the page; once the key visual is scrolled past (hv2-scrolled) it tucks itself away
  // so it never covers the sections on laptop-width windows, and its arrow reopens it until the viewer is back at the top.
  // A collapse chosen at the top of the page is kept in this browser; the automatic one is not.
  var SOC_KEY = 'hv2-social-collapsed';
  var socSaved = false;   // collapsed by the viewer at the top of the page (kept)
  var socOpened = false;  // reopened by the viewer while scrolled (until back at the top)
  function setSocSaved(on){
    socSaved = on;
    try { localStorage.setItem(SOC_KEY, on ? '1' : '0'); } catch (e) {}
  }
  function updateSocial(){
    var html = document.documentElement;
    var scrolled = html.classList.contains('hv2-scrolled');
    if (!scrolled) socOpened = false;
    var on = socSaved || (scrolled && !socOpened);
    html.classList.toggle('hv2-soc-collapsed', on);
    var t = document.querySelector('#hv2-social .hv2-soc-toggle');
    if (t){ t.setAttribute('aria-label', on ? 'Mở thanh mạng xã hội' : 'Thu gọn thanh mạng xã hội'); t.setAttribute('aria-expanded', on ? 'false' : 'true'); }
  }
  function toggleSocial(){
    var html = document.documentElement;
    var scrolled = html.classList.contains('hv2-scrolled');
    if (html.classList.contains('hv2-soc-collapsed')) { socOpened = scrolled; setSocSaved(false); }
    else if (scrolled) socOpened = false;
    else setSocSaved(true);
    updateSocial();
  }
  function buildSocialBar(){
    if (document.getElementById('hv2-social')) return;
    var bar = el('nav', { id: 'hv2-social', 'data-home-v2': '', 'aria-label': 'Mạng xã hội' });
    ${JSON.stringify(SOCIAL.map(([id, label, link]) => [id, label, link]))}.forEach(function(s){
      var attrs = { 'class': 'hv2-soc-i hv2-soc-' + s[0], 'aria-label': s[1], title: s[1] };
      // without an href an <a> has no role, so screen readers would drop its label: announce it as a disabled link
      if (s[2]) { attrs.href = s[2]; attrs.target = '_blank'; attrs.rel = 'noopener'; } else { attrs.role = 'link'; attrs['aria-disabled'] = 'true'; }
      bar.appendChild(el('a', attrs));
    });
    var toggle = el('button', { type: 'button', 'class': 'hv2-soc-toggle' });
    toggle.addEventListener('click', toggleSocial);
    bar.appendChild(toggle);
    document.body.appendChild(bar);
    try { socSaved = localStorage.getItem(SOC_KEY) === '1'; } catch (e) {}
    updateSocial();
  }

  // omg3q-style download panel: the QR and caption of the original (hidden) download bar, cloned so React's own nodes
  // are never moved, the Vietnamese buttons from DL_ART and the top-up box (both without links for now)
  function buildPanel(){
    if (document.getElementById('hv2-dlpanel')) return true;
    var dl = document.querySelector('.star-site-index-download');
    var qrImg = document.querySelector('.star-site-index-download-qrcode_box img');
    if (!dl || !qrImg) return false;
    var platforms = dlLinks();
    var qr = el('div', { 'class': 'hv2-dl-qr' }, [el('div', { 'class': 'hv2-dl-qr-img' }, [qrClone(qrImg)])]);
    var desc = document.querySelector('.star-site-index-download-qrcode_box p');
    if (desc && desc.textContent) qr.appendChild(el('div', { 'class': 'hv2-dl-qr-text', text: desc.textContent }));
    var grid = el('div', { 'class': 'hv2-dl-grid' });
    platforms.forEach(function(a){ grid.appendChild(a); });
    var panel = el('div', { id: 'hv2-dlpanel', 'data-home-v2': '' }, [qr, grid]);
    // in the compact layout the buttons set the panel height only once their images arrive: place the panel again then
    platforms.forEach(function(a){ var img = a.querySelector('img'); if (img) img.addEventListener('load', onResize); });
    var store = dl.querySelector('a.star-site-index-store');
    if (store && SHOW_TOPUP) panel.appendChild(topupBox(store));
    document.body.appendChild(panel);
    return true;
  }

  // Put the panel's top edge just below the event banner frame of the background art, so neither the
  // slogan nor the event line is covered (never above the header). The part of the panel that runs past
  // the 100vh key visual pushes the sections below down (--hv2-dl-push), so nothing is hidden under it.
  function placePanel(){
    var html = document.documentElement;
    var panel = document.getElementById('hv2-dlpanel');
    var ph = panel ? panel.offsetHeight : 0;
    if (!ph) return false;
    var vh = window.innerHeight;
    var top, push;
    if (compact()){
      // compact: the key art block (bar + whole picture) ends where the app's index element ends; the panel follows it
      var index = document.querySelector('.star-site-index');
      var artBottom = index ? Math.round(index.getBoundingClientRect().bottom + window.scrollY)
        : ${COMPACT_HEADER_H} + Math.round(window.innerWidth * KV.height / KV.width);
      top = artBottom + 12;
      push = Math.max(0, top + ph + 12 - artBottom);
    } else {
      var scale = Math.max(window.innerWidth / KV.width, vh / KV.height);
      top = Math.max(${HEADER_H} + 8, Math.round(KV.eventFrameBottom * scale) + 6);
      push = Math.max(0, top + ph + 24 - vh);
    }
    html.style.setProperty('--hv2-dl-top', top + 'px');
    html.style.setProperty('--hv2-dl-push', push + 'px');
    panelBottom = top + ph;
    onScroll();
    html.classList.add('hv2-dl-ready');
    return true;
  }
  var resizeTimer = null;
  function onResize(){
    if (!active) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(placePanel, 120);
  }
  function onScroll(){
    if (!active) return;
    // show the sidebar only once the download panel has gone under the fixed header
    var past = window.scrollY > Math.max(window.innerHeight * 0.75, panelBottom - ${HEADER_H});
    document.documentElement.classList.toggle('hv2-scrolled', past);
    updateSocial();
  }

  function runRenderers(){
    if (mounted) return;
    mounted = true;
    renderers.forEach(function(fn){ try { fn(api); } catch (e) { console.error('[hv2]', e); } });
  }

  // compact header menu: the button opens the image menu as a drop-down list; picking an item, tapping elsewhere,
  // Escape or leaving the compact width closes it
  function setMenuOpen(on){
    var html = document.documentElement;
    html.classList.toggle('hv2-menu-open', on);
    var b = document.getElementById('hv2-menu-btn');
    if (b){ b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Đóng menu' : 'Mở menu'); }
  }
  function buildMenuButton(){
    if (document.getElementById('hv2-menu-btn')) return;
    var b = el('button', { type: 'button', id: 'hv2-menu-btn', 'data-home-v2': '', 'aria-expanded': 'false', 'aria-label': 'Mở menu' }, [el('span')]);
    b.addEventListener('click', function(){ setMenuOpen(!document.documentElement.classList.contains('hv2-menu-open')); });
    // first in the page, so the keyboard reaches it before the menu items it opens
    document.body.insertBefore(b, document.body.firstChild);
    // pointerdown (not click): iOS Safari sends no click for a tap on plain content, so the menu would stay open
    document.addEventListener('pointerdown', function(e){
      if (!document.documentElement.classList.contains('hv2-menu-open') || !e.target.closest) return;
      if (!e.target.closest('#hv2-menu-btn') && !e.target.closest('.star-site-index-navs')) setMenuOpen(false);
    }, true);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && document.documentElement.classList.contains('hv2-menu-open')){ setMenuOpen(false); b.focus(); }
    });
    if (COMPACT){
      // switching layouts (a tablet turned, a window resized): close the menu and place the download panel again
      var onChange = function(){ setMenuOpen(false); if (active) placePanel(); };
      if (COMPACT.addEventListener) COMPACT.addEventListener('change', onChange); else if (COMPACT.addListener) COMPACT.addListener(onChange);
    }
  }

  function apply(){
    active = true;
    document.documentElement.classList.add('hv2');
    buildContainer();
    buildMenuButton();
    buildSocialBar();
    runRenderers();
    onScroll();
    // React renders the download bar late; one shared retry timer (~30s) clones it into the
    // panel and the sidebar, then places the panel (placement needs its rendered height)
    if (!(buildPanel() && buildSidebar() && placePanel()) && !sidebarTimer){
      var n = 0;
      sidebarTimer = setInterval(function(){
        var done = buildPanel() && buildSidebar() && placePanel();
        if (done || ++n > 120){ clearInterval(sidebarTimer); sidebarTimer = null; }
      }, 250);
    }
  }
  function teardown(){
    active = false;
    setMenuOpen(false);
    document.documentElement.classList.remove('hv2', 'hv2-scrolled');
  }
  // The main site is served at /: the app only renders the home page on #/index (set before it starts), but the address
  // bar shows the plain site address. The hash is removed once the app's router has read it (a timeout also lets the
  // router's own hashchange listener, added after this one, see #/index first). Coming back to / without a hash (the back
  // button) makes the app redirect to its unmirrored #/fab, so that is sent back to #/index.
  var ROOT_HOME = !EMBED && location.pathname === '/';
  function stripIndexHash(){
    // exactly #/index only: a hash carrying a query or a sub-path keeps it in the address
    if (ROOT_HOME && location.hash === '#/index') history.replaceState(history.state, '', location.pathname + location.search);
  }
  // RF sets the hash while <head> is still parsing, so an early hashchange can fire
  // before <body> exists; the DOMContentLoaded listener performs the first apply.
  function sync(){
    if (!document.body) return;
    var h = location.hash;
    // back at / without a hash (the back button), sent to the unmirrored #/fab, or opened on the app's mobile address
    // (#/m/..., not mirrored either): put #/index back in place without an event, before the router reads the address
    // (this hashchange listener is registered before the router's)
    if (ROOT_HOME && (!h || h === '#' || h === '#/' || h.indexOf('#/fab') === 0 || h.indexOf('#/m/') === 0)) {
      history.replaceState(history.state, '', location.pathname + location.search + '#/index');
    }
    if (isHome()) { apply(); setTimeout(stripIndexHash, 0); } else teardown();
  }

  // header nav: keep the NAV_VI items with their Vietnamese art (React may re-render the list at any time)
  var NAV_VI = ${JSON.stringify(NAV_VI)};
  function navEntry(href){
    for (var i = 0; i < NAV_VI.length; i++) if (NAV_VI[i][0] === href) return NAV_VI[i];
    return null;
  }
  function navVi(){
    // header logo: the 3Q Đại Chiến artwork (round, 203x152 WEBP) instead of the original Chinese logo
    var logo = document.querySelector('img.star-site-index-logo');
    if (logo && logo.getAttribute('src') !== '/3qdc-vi/home/logo-3qdc.webp'){
      logo.setAttribute('src', '/3qdc-vi/home/logo-3qdc.webp');
      logo.setAttribute('alt', '3Q Đại Chiến');
    }
    var items = document.querySelectorAll('.star-site-index-navs__item');
    for (var i = 0; i < items.length; i++){
      var a = items[i].querySelector('a');
      var entry = a && navEntry(a.getAttribute('href'));
      items[i].classList.toggle('hv2-nav-off', !entry);
      if (!entry) continue;
      var pairs = [['.star-site-index-navs__item-img', '.png'], ['.star-site-index-navs__item-img_hover', '-hover.png']];
      for (var k = 0; k < pairs.length; k++){
        var img = items[i].querySelector(pairs[k][0]), src = '/3qdc-vi/home/' + entry[2] + pairs[k][1];
        if (img && img.getAttribute('src') !== src) img.setAttribute('src', src);
      }
      if (a.getAttribute('aria-label') !== entry[3]) a.setAttribute('aria-label', entry[3]);
    }
  }
  // on the home layout a nav click scrolls to its section (below the fixed header) instead of changing the route.
  // Registered in the capture phase on window, so it runs before nav-sync (capture on document), which would
  // otherwise reload to the section page for these exact menu hrefs. Propagation is stopped for that reason.
  var navFix = null;
  function navTarget(entry){
    if (!entry[1]) return 0;
    var s = section(entry[1]);
    // a section still waiting for its data is display:none and has no position yet
    if (!s || !s.hasAttribute('data-ready')) return null;
    return Math.max(0, Math.round(s.getBoundingClientRect().top + window.scrollY - headerH()));
  }
  function onNavClick(e){
    if (!active || !e.target.closest) return;
    var a = e.target.closest('.star-site-index-navs__item > a');
    var entry = a && navEntry(a.getAttribute('href'));
    if (!entry) return;
    e.stopPropagation();
    // ctrl / cmd / shift click: the browser opens the link as usual, this page stays where it is
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setMenuOpen(false);
    var top = navTarget(entry);
    if (top === null) return;
    window.scrollTo({ top: top, behavior: 'smooth' });
    // blocks above may still change height during the smooth scroll: correct the landing once it ends
    var fixed = false;
    var fix = function(){
      if (fixed) return;
      fixed = true;
      window.removeEventListener('scrollend', fix);
      var t = navTarget(entry);
      if (t !== null && Math.abs(t - window.scrollY) > 2) window.scrollTo({ top: t, behavior: 'auto' });
    };
    clearTimeout(navFix);
    window.addEventListener('scrollend', fix);
    navFix = setTimeout(fix, 900);
    if (compact()) keepLanding(entry);
  }
  // compact layout: the blocks above the target fill in (hero data, pictures) while or after the page scrolls there, so for a
  // few seconds each change of the content height moves the page back onto the target, until the visitor scrolls or swipes
  var landingStop = null;
  function keepLanding(entry){
    if (landingStop) landingStop();
    var home = document.getElementById('home-v2');
    if (!home || !window.ResizeObserver) return;
    var ro = new ResizeObserver(function(){
      var t = navTarget(entry);
      if (t !== null && Math.abs(t - window.scrollY) > 2) window.scrollTo({ top: t, behavior: 'auto' });
    });
    var timer = null;
    var stop = function(){
      ro.disconnect(); clearTimeout(timer);
      window.removeEventListener('touchstart', stop); window.removeEventListener('wheel', stop);
      if (landingStop === stop) landingStop = null;
    };
    landingStop = stop;
    // the smooth scroll runs first; the observer only corrects once it has ended (scrollend or the 900ms fallback)
    setTimeout(function(){ if (landingStop === stop) ro.observe(home); }, 950);
    timer = setTimeout(stop, 4000);
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
  }

  // horizontal swipe on a touch screen (a mouse keeps its own clicks and drags): a finger move of more than 40px that is
  // mostly sideways calls onNext (to the left) or onPrev (to the right), and the click it may end with is dropped. The
  // node needs touch-action:pan-y pinch-zoom so an upward or downward swipe over it still scrolls the page (that cancels the
  // swipe) and two fingers still zoom.
  function swipe(node, onNext, onPrev){
    var x0 = null, y0 = 0, pid = null, swiped = false;
    node.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'mouse') return;
      x0 = e.clientX; y0 = e.clientY; pid = e.pointerId; swiped = false;
    });
    node.addEventListener('pointerup', function(e){
      if (x0 === null || e.pointerId !== pid) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2){
        swiped = true;
        setTimeout(function(){ swiped = false; }, 400);
        if (dx < 0) onNext(); else onPrev();
      }
    });
    node.addEventListener('pointercancel', function(){ x0 = null; });
    node.addEventListener('click', function(e){ if (swiped){ swiped = false; e.preventDefault(); e.stopPropagation(); } }, true);
  }

  var api = {
    el: el, local: local, snap: snap, section: section, ready: ready, compact: compact, compactQuery: COMPACT, swipe: swipe,
    onMount: function(fn){ renderers.push(fn); if (mounted) { try { fn(api); } catch (e) { console.error('[hv2]', e); } } }
  };
  window.__hv2 = api;

  window.addEventListener('hashchange', sync);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (!EMBED){
    // capture phase on window: runs before nav-sync (document capture) and the app's handlers on its root element
    window.addEventListener('click', onNavClick, true);
    new MutationObserver(navVi).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    navVi();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();`;

// Section scripts come after the layout script so window.__hv2 exists when they register; the hero skill icons
// script needs the html.hv2-embed flag the layout script sets inside the home hero iframe.
export const LAYOUT_V2_HTML =
  `<style data-home-v2>${CSS}${NEWS_CSS}${HEROES_CSS}${HEROES_MOBILE_CSS}${FEATURES_CSS}${HERO_SKILLS_CSS}${SHOW_TREASURE ? TREASURE_CSS : TREASURE_OFF_CSS}</style>` +
  `<script data-home-v2>${JS}</script>` +
  `<script data-home-v2>${HERO_SKILLS_JS}</script>` +
  `<script data-home-v2>${NEWS_JS}</script>` +
  `<script data-home-v2>${HEROES_JS}</script>` +
  `<script data-home-v2>${HEROES_MOBILE_JS}</script>` +
  `<script data-home-v2>${FEATURES_JS}</script>` +
  (SHOW_TREASURE ? `<script data-home-v2>${TREASURE_JS}</script>` : '');
