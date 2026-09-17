// hero-roster-data.mjs — the 52 heroes of the home page "Hệ Thống Tướng" block (4 factions × 13), owned by the site.
// Exported 2026-09-18 from the hero lists the mirrored /tuong page loads (POST /ds/ajax/endpoint.json,
// getQueryDataInfoListByCategory, table 452555206502894595, one category per faction), in that page's order, with the
// Vietnamese names the translation overlay showed. The artwork was copied byte for byte into overrides/home/tuong/<rowId>/:
//   pc.png        新官网PC立绘   2560x1306, the big portrait of the desktop block
//   mobile.png    新官网移动立绘 750x1624, the phone block's portrait
//   icon.png      新官网Icon     84x84 grey list icon
//   icon-on.png   新官网hoverIcon 84x84 icon of the selected hero
// The block's backgrounds are in overrides/home/tuong/nen/. Nothing here depends on the mirror any more.
// A hero: [rowId, Chinese name, Vietnamese name]; the Vietnamese name is also the key of HERO_SKILLS (hero-skills-data.mjs).

export const HERO_ART_DIR = '/3qdc-vi/home/tuong/';
export const HERO_BG_DIR = '/3qdc-vi/home/tuong/nen/';

export const HERO_FACTIONS = [
  {
    id: 'nguy', label: 'Ngụy', tab: 'phe-1-nguy', category: '454680400827016705',
    heroes: [
      ["454746268601176067", "曹操", "Tào Tháo"],
      ["457950183186518019", "郭嘉", "Quách Gia"],
      ["457950183299764224", "张辽", "Trương Liêu"],
      ["457950183849218056", "司马懿", "Tư Mã Ý"],
      ["457950184163790851", "曹仁", "Tào Nhân"],
      ["457950185250115588", "夏侯惇", "Hạ Hầu Đôn"],
      ["457950185346584586", "夏侯渊", "Hạ Hầu Uyên"],
      ["457950185447247876", "典韦", "Điển Vi"],
      ["457950185539522563", "许褚", "Hứa Chử"],
      ["457950185635991553", "甄姬", "Chân Cơ"],
      ["457950187166912513", "张郃", "Trương Cáp"],
      ["457950187259187207", "徐晃", "Từ Hoảng"],
      ["457950187351461897", "王异", "Vương Dị"],
    ],
  },
  {
    id: 'ngo', label: 'Ngô', tab: 'phe-2-ngo', category: '454680400827016707',
    heroes: [
      ["457950183635308549", "周瑜", "Chu Du"],
      ["457950183740166148", "孙策", "Tôn Sách"],
      ["457950184671301637", "陆逊", "Lục Tốn"],
      ["457950184767770628", "吕蒙", "Lữ Mông"],
      ["457950184868433927", "孙尚香", "Tôn Thượng Hương"],
      ["457950186223194114", "太史慈", "Thái Sử Từ"],
      ["457950186323857415", "周泰", "Chu Thái"],
      ["457950186420326405", "孙权", "Tôn Quyền"],
      ["457950186512601091", "步练师", "Bộ Luyện Sư"],
      ["457950186604875782", "孙坚", "Tôn Kiên"],
      ["457950187640868870", "大乔", "Đại Kiều"],
      ["457950187733143552", "小乔", "Tiểu Kiều"],
      ["457950187825418242", "甘宁", "Cam Ninh"],
    ],
  },
  {
    id: 'thuc', label: 'Thục', tab: 'phe-3-thuc', category: '454680400827016706',
    heroes: [
      ["457950183413010438", "诸葛亮", "Gia Cát Lượng"],
      ["457950183526256643", "赵云", "Triệu Vân"],
      ["457950184264454146", "刘备", "Lưu Bị"],
      ["457950184369311748", "关羽", "Quan Vũ"],
      ["457950184469975042", "张飞", "Trương Phi"],
      ["457950184570638340", "马超", "Mã Siêu"],
      ["457950185728266249", "庞统", "Bàng Thống"],
      ["457950185833123840", "徐庶", "Từ Thứ"],
      ["457950185929592838", "黄忠", "Hoàng Trung"],
      ["457950186026061827", "魏延", "Ngụy Diên"],
      ["457950186122530821", "黄月英", "Hoàng Nguyệt Anh"],
      ["457950187447930883", "张星彩", "Trương Tinh Thải"],
      ["457950187544399872", "关银屏", "Quan Ngân Bình"],
    ],
  },
  {
    id: 'quan', label: 'Quần', tab: 'phe-4-quan', category: '454680400827016708',
    heroes: [
      ["457950183954075655", "吕布", "Lữ Bố"],
      ["457950184058933251", "貂蝉", "Điêu Thuyền"],
      ["457950184964902921", "华佗", "Hoa Đà"],
      ["457950185057177606", "左慈", "Tả Từ"],
      ["457950185153646597", "贾诩", "Giả Hủ"],
      ["457950186701344776", "吕玲绮", "Lữ Linh Khởi"],
      ["457950186793619460", "张春华", "Trương Xuân Hoa"],
      ["457950186890088452", "孟获", "Mạnh Hoạch"],
      ["457950186982363139", "祝融", "Chúc Dung"],
      ["457950187074637826", "袁绍", "Viên Thiệu"],
      ["457950187917692933", "张角", "Trương Giác"],
      ["457950188014161928", "董卓", "Đổng Trác"],
      ["457950188102242312", "蔡文姬", "Thái Văn Cơ"],
    ],
  },
];

// the block opens on Ngô, first hero Chu Du, like /tuong did
export const DEFAULT_FACTION = 1;
