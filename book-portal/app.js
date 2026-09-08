// 社内書籍ポータル - フロントエンドのみMock実装(localStorageをMockリポジトリとして使用)
// データモデルは docs/data-model.md を参照。Book / Holding を分離している。
const STORAGE_KEY = "bookPortalState_v1";
const USERS = ["山田", "田中", "佐藤", "鈴木", "高橋"]; // テストモード(LINE未連携時)用の仮ユーザー
const LIFF_ID = "2011169477-JliRjzo1";
let lineProfile = null; // LINEログイン中はここにプロフィールが入る

function getKnownUsers() {
  if (!state.knownUsers || !state.knownUsers.length) state.knownUsers = USERS.slice();
  return state.knownUsers;
}

const CATEGORY_OPTIONS = [
  { value: "一般・入門・ビジネス", curry: "CHICKEN" },
  { value: "実務・技術・How-to", curry: "PORK" },
  { value: "専門・体系的・リファレンス", curry: "BEEF" },
  { value: "デザイン・創作・視覚表現", curry: "SEAFOOD" },
  { value: "理論・数学・哲学・抽象", curry: "BEAN" },
  { value: "Tips集・辞典・用語集・雑学", curry: "KEEMA" },
  { value: "一般教養・複数分野横断", curry: "VEGETABLE" },
];

const CURRY_LABEL = {
  CHICKEN: "🐔 チキンカレー",
  PORK: "🐖 ポークカレー",
  BEEF: "🐄 ビーフカレー",
  SEAFOOD: "🦐 シーフードカレー",
  BEAN: "🫘 豆カレー",
  GAME: "🦌 ジビエカレー",
  KEEMA: "🍛 キーマカレー",
  VEGETABLE: "🥕 野菜カレー",
};
const CURRY_FLAVOR_TEXT = {
  CHICKEN: "定番で手に取りやすい一冊です。",
  PORK: "実務にすぐ活かせる実践派です。",
  BEEF: "体系的でどっしりしたリファレンスです。",
  SEAFOOD: "視覚表現が持ち味の一冊です。",
  BEAN: "理論・抽象思考がテーマの一冊です。",
  GAME: "社内では珍しい専門分野の一冊です。",
  KEEMA: "小テーマが詰まったTips系の一冊です。",
  VEGETABLE: "幅広いテーマを扱う教養系の一冊です。",
};
const SPICE_LEVELS = [
  { max: 20, key: "MILD", label: "甘口", chili: "🌶" },
  { max: 40, key: "MEDIUM", label: "中辛", chili: "🌶🌶" },
  { max: 60, key: "HOT", label: "辛口", chili: "🌶🌶🌶" },
  { max: 80, key: "VERY_HOT", label: "大辛", chili: "🌶🌶🌶🌶" },
  { max: 100, key: "EXTREME", label: "激辛", chili: "🌶🌶🌶🌶🌶" },
];
const SPICE_COMMENT = {
  MILD: "気軽に読み進められます。",
  MEDIUM: "少し前提知識があると読みやすいです。",
  HOT: "腰を据えて読みたい辛さです。",
  VERY_HOT: "関連知識なしで挑むとかなり辛めです。",
  EXTREME: "上級者向けの激辛です。",
};
const TOPPING_LABEL = {
  CHEESE: "🧀 チーズ(図解が多い)",
  EGG: "🥚 たまご(初心者向け解説)",
  KATSU: "🍗 カツ(実例が豊富)",
  EXTRA_SPICE: "🌶 追いスパイス(専門用語が多い)",
  LARGE_PORTION: "🍚 大盛り(ページ数が多い)",
};
const TOPPING_COMMENT = {
  KATSU: "実例やサンプルが豊富。",
  CHEESE: "図解が理解を助けてくれます。",
  EGG: "初心者向けの解説も丁寧。",
  EXTRA_SPICE: "専門用語や数式多めです。",
  LARGE_PORTION: "ボリュームたっぷり。",
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(dateStr, days) { const d = new Date(dateStr); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.floor((new Date(b) - new Date(a)) / 86400000); }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function hashStr(s) {
  let h = 0;
  for (const ch of s || "") h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return h;
}

function spiceLevelFromScore(score) {
  return SPICE_LEVELS.find((l) => score <= l.max) || SPICE_LEVELS[SPICE_LEVELS.length - 1];
}

// ---------- Mock分析ロジック(AI/外部API相当) ----------
function fetchBookInfoMock(isbn) {
  const h = hashStr(isbn);
  const cat = CATEGORY_OPTIONS[h % CATEGORY_OPTIONS.length].value;
  return {
    title: `(ISBN取得Mock) 書籍${isbn.slice(-4) || h}`,
    authors: "著者未設定",
    publisher: "出版社未設定",
    description: "ISBN Mock取得によるダミーの説明文です。",
    category: cat,
    pageCount: 150 + (h % 350),
  };
}

function fetchProductInfoMock(isbn) {
  const h = hashStr(isbn || "0");
  const sizeCm = 15 + (h % 8);
  const weightG = 150 + (h % 400);
  return {
    physicalHeight: sizeCm,
    physicalWidth: 13,
    physicalLength: 2,
    physicalWeight: weightG,
    physicalDimensionUnit: "cm",
    physicalWeightUnit: "g",
    amazonAsin: "MOCK" + h,
  };
}

function computePhysicalLoad(weightG) {
  if (!weightG) return null;
  return clamp(Math.round((weightG / 600) * 100), 0, 100);
}

function computeReadingLoad(book, flags) {
  let score = 20;
  if (book.pageCount) score += Math.min(30, Math.round((book.pageCount / 500) * 30));
  if (flags.expertHeavy) score += 30;
  if (flags.exampleRich) score -= 10;
  if (flags.diagramRich) score -= 10;
  if (flags.beginnerFriendly) score -= 15;
  score += hashStr(book.title) % 10;
  return clamp(Math.round(score), 0, 100);
}

function computeToppings(book, flags) {
  const t = [];
  if (flags.diagramRich) t.push("CHEESE");
  if (flags.beginnerFriendly) t.push("EGG");
  if (flags.exampleRich) t.push("KATSU");
  if (flags.expertHeavy) t.push("EXTRA_SPICE");
  if (book.pageCount && book.pageCount > 400) t.push("LARGE_PORTION");
  return t;
}

function analyzeBook(book, flags, existingBooks) {
  const baseCurry = (CATEGORY_OPTIONS.find((c) => c.value === book.category) || {}).curry || "VEGETABLE";
  const sameCategoryCount = existingBooks.filter((b) => b.category === book.category && b.id !== book.id).length;
  const curryType = sameCategoryCount === 0 ? "GAME" : baseCurry;

  const readingLoadScore = computeReadingLoad(book, flags);
  const spice = spiceLevelFromScore(readingLoadScore);
  const toppings = computeToppings(book, flags);
  const physicalLoadScore = computePhysicalLoad(book.physicalWeight);
  const estimatedReadingMinutes = book.pageCount ? Math.round(book.pageCount * 1.5) : null;
  const referenceBrainCalories = estimatedReadingMinutes ? Math.round(estimatedReadingMinutes * 1.2) : null;

  const toppingComments = toppings.map((t) => TOPPING_COMMENT[t]).join("");
  const reason = `${CURRY_FLAVOR_TEXT[curryType]}${SPICE_COMMENT[spice.key]}${toppingComments}`;

  return {
    readingLoadScore,
    physicalLoadScore,
    estimatedReadingMinutes,
    referenceBrainCalories,
    curry: { curryType, spiceLevel: spice.key, toppings, reason, generatedBy: "MOCK", analyzedAt: todayStr() },
  };
}

function findSimilarBooksMock(query, books) {
  const qWords = query.toLowerCase().split(/[\s　,、]+/).filter(Boolean);
  if (qWords.length === 0) return [];
  const scored = books.map((b) => {
    const text = `${b.title} ${b.description || ""} ${b.category || ""} ${(b.tags || []).join(" ")}`.toLowerCase();
    let hits = 0;
    qWords.forEach((w) => { if (w.length > 0 && text.includes(w)) hits++; });
    return { book: b, score: hits / qWords.length };
  });
  return scored.filter((s) => s.score >= 0.15).sort((a, b) => b.score - a.score).slice(0, 3);
}

// ---------- 初期データ ----------
function seedState() {
  const books = [
    { id: uid(), isbn: "9784000000001", title: "リーダブルコード", authors: "Dustin Boswell", publisher: "オライリー", description: "読みやすいコードを書くための実践的なガイド。", category: "実務・技術・How-to", pageCount: 260, physicalHeight: 21, physicalWidth: 15, physicalLength: 1.5, physicalWeight: 320, price: 2400 },
    { id: uid(), isbn: "9784000000002", title: "エンジニアの成長戦略", authors: "山田太郎", publisher: "技術評論社", description: "キャリアを長期的に伸ばすための考え方。", category: "一般・入門・ビジネス", pageCount: 180, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.2, physicalWeight: 250, price: 1800 },
    { id: uid(), isbn: "9784000000003", title: "分散システム設計の教科書", authors: "田中花子", publisher: "翔泳社", description: "大規模システムを支える分散設計の理論と実践。", category: "専門・体系的・リファレンス", pageCount: 480, physicalHeight: 23, physicalWidth: 18, physicalLength: 3, physicalWeight: 620, price: 3200 },
    { id: uid(), isbn: "9784000000004", title: "はじめてのUIデザイン", authors: "佐藤次郎", publisher: "MdN", description: "初心者向けにUIデザインの基礎を解説。", category: "デザイン・創作・視覚表現", pageCount: 150, physicalHeight: 18, physicalWidth: 12, physicalLength: 1, physicalWeight: 200, price: 1600 },

    // ---- 一般・入門・ビジネス ----
    { id: uid(), isbn: "9784000000005", title: "新人エンジニアのための仕事術", authors: "中村航", publisher: "日経BP", description: "社会人1年目に押さえておきたい基本の考え方とふるまい。", category: "一般・入門・ビジネス", pageCount: 200, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.3, physicalWeight: 260, price: 1500 },
    { id: uid(), isbn: "9784000000006", title: "リーダーになる前に読む本", authors: "小林恵", publisher: "ダイヤモンド社", description: "はじめてチームを持つ人へ向けたマネジメントの入り口。", category: "一般・入門・ビジネス", pageCount: 220, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.4, physicalWeight: 270, price: 1600 },
    { id: uid(), isbn: "9784000000007", title: "会議が変わるファシリテーション入門", authors: "松本亮", publisher: "PHP研究所", description: "話し合いを前に進めるための基本テクニック集。", category: "一般・入門・ビジネス", pageCount: 190, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.2, physicalWeight: 240, price: 1500 },

    // ---- 実務・技術・How-to ----
    { id: uid(), isbn: "9784000000008", title: "現場で使えるGit入門", authors: "木村隼人", publisher: "技術評論社", description: "チーム開発で困らないためのGit運用の実践知識。", category: "実務・技術・How-to", pageCount: 240, physicalHeight: 21, physicalWidth: 15, physicalLength: 1.6, physicalWeight: 340, price: 2200 },
    { id: uid(), isbn: "9784000000009", title: "実践クラウドインフラ構築ガイド", authors: "高橋step", publisher: "翔泳社", description: "クラウド環境の設計から運用までを一気通貫で解説。", category: "実務・技術・How-to", pageCount: 300, physicalHeight: 22, physicalWidth: 16, physicalLength: 2, physicalWeight: 420, price: 2800 },
    { id: uid(), isbn: "9784000000010", title: "テスト自動化の教科書", authors: "藤田さくら", publisher: "オライリー", description: "手動テストから自動化へ移行するための実践手順。", category: "実務・技術・How-to", pageCount: 280, physicalHeight: 21, physicalWidth: 15, physicalLength: 1.8, physicalWeight: 380, price: 2600 },

    // ---- 専門・体系的・リファレンス ----
    { id: uid(), isbn: "9784000000011", title: "データベース内部構造の理論と実装", authors: "岡本圭吾", publisher: "共立出版", description: "インデックスやトランザクションの仕組みを体系的に解説。", category: "専門・体系的・リファレンス", pageCount: 520, physicalHeight: 23, physicalWidth: 18, physicalLength: 3.2, physicalWeight: 680, price: 3800 },
    { id: uid(), isbn: "9784000000012", title: "コンパイラ構成技法", authors: "西村悠", publisher: "サイエンス社", description: "字句解析から最適化までを網羅する定番リファレンス。", category: "専門・体系的・リファレンス", pageCount: 560, physicalHeight: 23, physicalWidth: 18, physicalLength: 3.4, physicalWeight: 700, price: 4200 },
    { id: uid(), isbn: "9784000000013", title: "ネットワークプロトコル大全", authors: "橋本直樹", publisher: "オーム社", description: "TCP/IPから最新プロトコルまでを一冊に集約。", category: "専門・体系的・リファレンス", pageCount: 540, physicalHeight: 23, physicalWidth: 18, physicalLength: 3.3, physicalWeight: 690, price: 4000 },

    // ---- デザイン・創作・視覚表現 ----
    { id: uid(), isbn: "9784000000014", title: "配色とレイアウトの基本ルール", authors: "永井さやか", publisher: "エムディエヌ", description: "実例で学ぶ、見やすく美しい配色・レイアウトの原則。", category: "デザイン・創作・視覚表現", pageCount: 160, physicalHeight: 18, physicalWidth: 12, physicalLength: 1.1, physicalWeight: 210, price: 1700 },
    { id: uid(), isbn: "9784000000015", title: "写真で伝えるビジュアルストーリーテリング", authors: "石田蓮", publisher: "玄光社", description: "一枚の写真で物語を伝えるための構図と編集の技法。", category: "デザイン・創作・視覚表現", pageCount: 180, physicalHeight: 18, physicalWidth: 12, physicalLength: 1.3, physicalWeight: 230, price: 1900 },
    { id: uid(), isbn: "9784000000016", title: "プロダクトデザインのスケッチ術", authors: "村上悠斗", publisher: "ビー・エヌ・エヌ", description: "アイデアを素早く形にするためのスケッチの描き方。", category: "デザイン・創作・視覚表現", pageCount: 170, physicalHeight: 18, physicalWidth: 12, physicalLength: 1.2, physicalWeight: 220, price: 1800 },

    // ---- 理論・数学・哲学・抽象 ----
    { id: uid(), isbn: "9784000000017", title: "圏論のはじめかた", authors: "牧野遼", publisher: "日本評論社", description: "対象と射という考え方から圏論の基礎をやさしく紹介。", category: "理論・数学・哲学・抽象", pageCount: 260, physicalHeight: 21, physicalWidth: 15, physicalLength: 1.7, physicalWeight: 340, price: 2600 },
    { id: uid(), isbn: "9784000000018", title: "論理学入門", authors: "小川智也", publisher: "岩波書店", description: "命題論理・述語論理を基礎から学ぶ定番の入門書。", category: "理論・数学・哲学・抽象", pageCount: 240, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.6, physicalWeight: 300, price: 2200 },
    { id: uid(), isbn: "9784000000019", title: "確率と統計の考え方", authors: "青木美穂", publisher: "講談社", description: "身近な例から確率・統計の基本概念を丁寧に解説。", category: "理論・数学・哲学・抽象", pageCount: 230, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.5, physicalWeight: 290, price: 2000 },
    { id: uid(), isbn: "9784000000020", title: "哲学対話のすすめ", authors: "宮下大輔", publisher: "筑摩書房", description: "答えのない問いをめぐって対話するための入り口。", category: "理論・数学・哲学・抽象", pageCount: 200, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.3, physicalWeight: 260, price: 1800 },

    // ---- Tips集・辞典・用語集・雑学 ----
    { id: uid(), isbn: "9784000000021", title: "IT用語ポケット辞典", authors: "編集部", publisher: "技術評論社", description: "現場でよく使うIT用語を短い説明でまとめた携帯版辞典。", category: "Tips集・辞典・用語集・雑学", pageCount: 320, physicalHeight: 15, physicalWidth: 10, physicalLength: 2, physicalWeight: 260, price: 1200 },
    { id: uid(), isbn: "9784000000022", title: "ショートカットキー百科", authors: "編集部", publisher: "インプレス", description: "主要ソフトの作業効率を上げるショートカット集。", category: "Tips集・辞典・用語集・雑学", pageCount: 180, physicalHeight: 15, physicalWidth: 10, physicalLength: 1.2, physicalWeight: 180, price: 1000 },
    { id: uid(), isbn: "9784000000023", title: "ビジネス略語辞典", authors: "編集部", publisher: "日経BP", description: "会議やメールで飛び交う略語をさっと調べられる一冊。", category: "Tips集・辞典・用語集・雑学", pageCount: 260, physicalHeight: 15, physicalWidth: 10, physicalLength: 1.6, physicalWeight: 220, price: 1100 },
    { id: uid(), isbn: "9784000000024", title: "雑学で学ぶ世界の歴史", authors: "秋山哲", publisher: "PHP研究所", description: "小ネタから世界史の流れをつかむ雑学読み物。", category: "Tips集・辞典・用語集・雑学", pageCount: 240, physicalHeight: 18, physicalWidth: 12, physicalLength: 1.5, physicalWeight: 280, price: 1400 },

    // ---- 一般教養・複数分野横断 ----
    { id: uid(), isbn: "9784000000025", title: "教養としてのアート入門", authors: "川口optimize", publisher: "新潮社", description: "美術史の流れを一般教養としてつかむための入門書。", category: "一般教養・複数分野横断", pageCount: 220, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.5, physicalWeight: 280, price: 1800 },
    { id: uid(), isbn: "9784000000026", title: "文系のためのテクノロジー入門", authors: "菅原光", publisher: "光文社", description: "専門用語を避けながら最新技術の全体像をつかむ一冊。", category: "一般教養・複数分野横断", pageCount: 210, physicalHeight: 18, physicalWidth: 12, physicalLength: 1.4, physicalWeight: 260, price: 1600 },
    { id: uid(), isbn: "9784000000027", title: "世界史と経済のつながりを学ぶ", authors: "遠藤久美", publisher: "東洋経済新報社", description: "歴史の出来事を経済の視点から読み直す教養書。", category: "一般教養・複数分野横断", pageCount: 260, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.7, physicalWeight: 320, price: 1900 },
    { id: uid(), isbn: "9784000000028", title: "科学と社会の教科書", authors: "土屋真由", publisher: "岩波書店", description: "科学技術が社会に与える影響を横断的に考える入門書。", category: "一般教養・複数分野横断", pageCount: 230, physicalHeight: 19, physicalWidth: 13, physicalLength: 1.5, physicalWeight: 290, price: 1700 },
  ];

  const OWNER_ROTATION = ["山田", "田中", "佐藤", "鈴木", "高橋"];
  const holdings = [
    { id: uid(), bookId: books[0].id, holdingType: "COMPANY", ownerId: null, ownerDisplayName: "会社", location: "本棚A", visibility: "LOAN_AVAILABLE", loanAllowed: true, currentHolderId: "山田", currentHolderDisplayName: "山田", status: "ON_LOAN", availableFrom: null },
    { id: uid(), bookId: books[1].id, holdingType: "PERSONAL", ownerId: "田中", ownerDisplayName: "田中", location: "田中の席", visibility: "LOAN_AVAILABLE", loanAllowed: true, currentHolderId: "田中", currentHolderDisplayName: "田中", status: "AVAILABLE", availableFrom: null },
    { id: uid(), bookId: books[2].id, holdingType: "COMPANY", ownerId: null, ownerDisplayName: "会社", location: "本棚B", visibility: "LOAN_AVAILABLE", loanAllowed: true, currentHolderId: "佐藤", currentHolderDisplayName: "佐藤", status: "ON_LOAN", availableFrom: null },
    { id: uid(), bookId: books[3].id, holdingType: "PERSONAL", ownerId: "鈴木", ownerDisplayName: "鈴木", location: "鈴木の席", visibility: "INTERNAL_VISIBLE", loanAllowed: false, currentHolderId: "鈴木", currentHolderDisplayName: "鈴木", status: "AVAILABLE", availableFrom: null },
  ];
  // 5冊目以降(index 4〜)は会社所有／私物を交互にして、各所蔵はデフォルトで在庫(AVAILABLE)にする
  for (let i = 4; i < books.length; i++) {
    const isCompany = i % 2 === 0;
    const owner = OWNER_ROTATION[i % OWNER_ROTATION.length];
    holdings.push({
      id: uid(), bookId: books[i].id,
      holdingType: isCompany ? "COMPANY" : "PERSONAL",
      ownerId: isCompany ? null : owner,
      ownerDisplayName: isCompany ? "会社" : owner,
      location: isCompany ? `本棚${String.fromCharCode(65 + (i % 4))}` : `${owner}の席`,
      visibility: "LOAN_AVAILABLE", loanAllowed: true,
      currentHolderId: owner, currentHolderDisplayName: owner,
      status: "AVAILABLE", availableFrom: null,
    });
  }
  // 数冊は貸出中の状態にして、貸出待ち等のデモがしやすいようにする
  [5, 10, 15, 20].forEach((idx) => {
    if (holdings[idx]) { holdings[idx].status = "ON_LOAN"; }
  });

  const loans = [
    { id: uid(), holdingId: holdings[0].id, borrowerId: "山田", borrowedAt: addDays(todayStr(), -5), dueAt: addDays(todayStr(), 9), returnedAt: null, status: "ACTIVE" },
    { id: uid(), holdingId: holdings[2].id, borrowerId: "佐藤", borrowedAt: addDays(todayStr(), -20), dueAt: addDays(todayStr(), -6), returnedAt: null, status: "ACTIVE" },
  ];
  [5, 10, 15, 20].forEach((idx) => {
    const h = holdings[idx];
    if (h && h.status === "ON_LOAN") {
      loans.push({ id: uid(), holdingId: h.id, borrowerId: h.currentHolderId, borrowedAt: addDays(todayStr(), -3), dueAt: addDays(todayStr(), 11), returnedAt: null, status: "ACTIVE" });
    }
  });
  return {
    books, holdings, loans,
    borrowRequests: [], relayRequests: [], reviews: [], purchaseRequests: [],
    bookmarks: {},
    knownUsers: USERS.slice(),
    currentUser: USERS[0],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { const s = seedState(); saveState(s); return s; }
  try { return JSON.parse(raw); } catch (e) { const s = seedState(); saveState(s); return s; }
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

let state = loadState();
let currentView = window.location.hash === "#presentation" ? "presentation" : "home";
let currentParam = null;

function setView(view, param) {
  currentView = view; currentParam = param || null;
  if (view === "presentation") {
    window.history.replaceState(null, "", "#presentation");
  } else if (window.location.hash === "#presentation") {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  render();
}

document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (btn) setView(btn.dataset.view);
});

document.getElementById("presentationLink").addEventListener("click", (e) => {
  e.preventDefault();
  setView("presentation");
});

const userSelect = document.getElementById("currentUser");
userSelect.addEventListener("change", () => { state.currentUser = userSelect.value; saveState(state); render(); });

function renderUserSwitch() {
  if (lineProfile) {
    document.getElementById("userSwitch").hidden = true;
    document.getElementById("lineUser").hidden = false;
    document.getElementById("lineUserPic").src = lineProfile.pictureUrl || "";
    document.getElementById("lineUserName").textContent = lineProfile.displayName;
    return;
  }
  document.getElementById("userSwitch").hidden = false;
  document.getElementById("lineUser").hidden = true;
  userSelect.innerHTML = "";
  getKnownUsers().forEach((u) => { const o = document.createElement("option"); o.value = u; o.textContent = u; userSelect.appendChild(o); });
  userSelect.value = state.currentUser;
}

// LINE(LIFF)経由で開かれた場合、LINEプロフィールを取得してログインユーザーとして扱う。
// LINE外のブラウザ(通常のPCブラウザ等)で開いた場合は、従来どおり手動のユーザー切り替えを使う(テストモード)。
async function initLineLogin() {
  if (typeof liff === "undefined") return; // SDK未読み込み(オフライン等)
  try {
    await liff.init({ liffId: LIFF_ID });
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      lineProfile = profile;
      if (!getKnownUsers().includes(profile.displayName)) getKnownUsers().push(profile.displayName);
      state.currentUser = profile.displayName;
      saveState(state);
    }
  } catch (e) {
    console.warn("LIFF初期化に失敗しました(LINE外ブラウザ等のため通常モードで起動):", e);
  }
}

function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function bookById(id) { return state.books.find((b) => b.id === id); }
function holdingById(id) { return state.holdings.find((h) => h.id === id); }

function isHoldingVisibleTo(holding, user) {
  if (holding.holdingType === "COMPANY") return true;
  if (holding.ownerId === user) return true;
  return holding.visibility !== "PRIVATE";
}
function isHoldingLoanable(holding) {
  if (holding.holdingType === "COMPANY") return true;
  return holding.visibility === "LOAN_AVAILABLE";
}

function render() {
  const main = document.getElementById("main");
  main.innerHTML = "";
  const views = {
    home: renderHome,
    shelf: renderShelf, detail: renderDetail, register: renderRegister,
    loan: renderLoan, relay: renderRelay, wishlist: renderWishlist,
    mypage: renderMyPage, notify: renderNotify, manual: renderManual,
    presentation: renderPresentation,
  };
  main.appendChild(views[currentView]());
}

// ---------- ホーム(本棚の小部屋メニュー) ----------
const HOME_ICONS = {
  search: '<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>',
  book: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><line x1="12" y1="4" x2="12" y2="20"/>',
  undo: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><line x1="12" y1="12" x2="12" y2="7"/><line x1="12" y1="12" x2="16" y2="14"/>',
  chat: '<rect x="4" y="5" width="16" height="10" rx="2"/><path d="M8 15l-2 4 5-4"/>',
  heart: '<path d="M12 20.5s-7-4.2-9.3-8.3C1 9 2.4 5.2 5.9 5.2c2 0 3.5 1.1 4 2.4.5-1.3 2-2.4 4-2.4 3.5 0 4.9 3.8 3.2 7-2.3 4.1-9.1 8.3-9.1 8.3z"/>',
  plus: '<circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  relay: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  bell: '<path d="M12 4a4.5 4.5 0 0 0-4.5 4.5v3c0 1-.4 2-1.1 2.7L5 15.5h14l-1.4-1.3c-.7-.7-1.1-1.7-1.1-2.7v-3A4.5 4.5 0 0 0 12 4z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>',
  doc: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
};
function homeIcon(name) {
  return `<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${HOME_ICONS[name]}</svg>`;
}

// ホーム上段の機能イラスト。外部画像やアイコンライブラリに依存しない軽量なSVG。
const HOME_ILLUSTRATIONS = {
  search: `
    <path class="feature-fill" d="M10 14h24a6 6 0 0 1 6 6v28H16a6 6 0 0 0-6 6z"/>
    <path d="M10 14h24a6 6 0 0 1 6 6v28H16a6 6 0 0 0-6 6V20a6 6 0 0 0-6-6z"/>
    <circle cx="43" cy="31" r="9"/><path d="m50 38 8 8"/>`,
  plus: `
    <path class="feature-fill" d="M11 15h27a6 6 0 0 1 6 6v31H17a6 6 0 0 0-6 6z"/>
    <path d="M11 15h27a6 6 0 0 1 6 6v31H17a6 6 0 0 0-6 6V21a6 6 0 0 0-6-6z"/>
    <circle cx="48" cy="18" r="11"/><path d="M48 12v12M42 18h12"/>`,
  book: `
    <path class="feature-fill" d="M8 17h20a7 7 0 0 1 7 7v27H15a7 7 0 0 0-7 7z"/>
    <path d="M8 17h20a7 7 0 0 1 7 7v27H15a7 7 0 0 0-7 7V24a7 7 0 0 0-7-7z"/>
    <path d="M38 25h18M50 19l6 6-6 6"/>`,
  undo: `
    <path class="feature-fill" d="M20 15h29a6 6 0 0 1 6 6v31H26a6 6 0 0 0-6 6z"/>
    <path d="M20 15h29a6 6 0 0 1 6 6v31H26a6 6 0 0 0-6 6z"/>
    <path d="M21 35H7m6-7-7 7 7 7"/>`,
  relay: `
    <path class="feature-fill" d="M21 19h22v29H21z"/><path d="M21 19h22v29H21zM26 25h12M26 31h9"/>
    <path d="M8 15h13l-5-5M56 52H43l5 5M21 10v10M43 44v13"/>`,
  heart: `
    <path class="feature-fill" d="M10 13h24a6 6 0 0 1 6 6v31H16a6 6 0 0 0-6 6z"/>
    <path d="M10 13h24a6 6 0 0 1 6 6v31H16a6 6 0 0 0-6 6V19a6 6 0 0 0-6-6z"/>
    <path d="M49 18c-5-7-15 0-8 8l8 8 8-8c7-8-3-15-8-8z"/>`,
  chat: `
    <path class="feature-fill" d="M8 12h31a6 6 0 0 1 6 6v30H14a6 6 0 0 0-6 6z"/>
    <path d="M8 12h31a6 6 0 0 1 6 6v30H14a6 6 0 0 0-6 6z"/>
    <path d="m50 22 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>`,
  user: `
    <circle class="feature-fill" cx="32" cy="19" r="10"/><circle cx="32" cy="19" r="10"/>
    <path class="feature-fill" d="M12 55c1-13 9-20 20-20s19 7 20 20z"/><path d="M12 55c1-13 9-20 20-20s19 7 20 20"/>
    <path d="M47 13h10v29H47M51 20h2M51 26h2M51 32h2"/>`,
  bell: `
    <path class="feature-fill" d="M17 43h30l-4-6V26a11 11 0 0 0-22 0v11z"/>
    <path d="M17 43h30l-4-6V26a11 11 0 0 0-22 0v11zM27 48a5 5 0 0 0 10 0"/>
    <path d="M48 12h9v19M52 17h2M52 22h2M52 27h2"/>`,
};

function homeIllustration(name, index, title) {
  return `<svg class="home-feature-svg" viewBox="0 0 64 64" role="img" aria-label="${title}のアイコン" style="color:${SHELF_TONES[index % SHELF_TONES.length]}">
    ${HOME_ILLUSTRATIONS[name]}
  </svg>`;
}

const HOME_TILES = [
  { view: "shelf", icon: "search", title: "さがす", sub: "蔵書をさがす" },
  { view: "register", icon: "plus", title: "登録する", sub: "書籍・所蔵を登録" },
  { view: "loan", icon: "book", title: "かりる", sub: "貸出を届け出る" },
  { view: "loan", icon: "undo", title: "かえす", sub: "返却・貸出待ち" },
  { view: "relay", icon: "relay", title: "リレー", sub: "バトン読書" },
  { view: "wishlist", icon: "heart", title: "ほしい本", sub: "購入希望" },
  { view: "shelf", icon: "chat", title: "レビュー", sub: "感想を書く" },
  { view: "mypage", icon: "user", title: "マイページ", sub: "自分の状況を見る" },
  { view: "notify", icon: "bell", title: "通知プレビュー", sub: "しきい値の確認" },
];

function renderHome() {
  const wrap = el(`<div>
    <div class="home-frame">
      <div class="home-frame-header">
        <h2>社内書籍管理</h2>
        <span class="home-subtitle">BOOK SHELF</span>
        <div class="home-dots"><span></span><span></span><span></span></div>
      </div>
      <div class="home-grid" id="homeGrid"></div>
    </div>
    <p class="note" style="margin-top:14px;">操作マニュアルは下部ナビの「操作マニュアル」から確認できます。</p>
  </div>`);

  const grid = wrap.querySelector("#homeGrid");
  HOME_TILES.forEach((t, i) => {
    const cell = el(`<button class="home-cell" type="button">
      <div class="home-shelf-illust">${homeIllustration(t.icon, i, t.title)}</div>
      <div class="home-cell-label">
        ${homeIcon(t.icon)}
        <div class="text"><b>${t.title}</b><span>${t.sub}</span></div>
      </div>
    </button>`);
    cell.addEventListener("click", () => setView(t.view));
    grid.appendChild(cell);
  });
  return wrap;
}

function holdingBadges(holding) {
  return `
    <span class="tag type-${holding.holdingType}">${holding.holdingType === "COMPANY" ? "会社所有" : "私物"}</span>
    <span class="tag status-${holding.status}">${holding.status === "AVAILABLE" ? "在庫" : holding.status === "ON_LOAN" ? "貸出中" : "利用不可"}</span>
    ${holding.holdingType === "PERSONAL" ? `<span class="tag">${holding.visibility}</span>` : ""}
  `;
}

// ---------- 本棚 ----------
let shelfDisplayMode = "grid"; // "grid" (標準表示) | "size" (実寸表示)

function spineDimensions(book) {
  const heightCm = book.physicalHeight || 20;
  const thicknessCm = book.physicalLength || 2;
  return {
    heightPx: clamp(Math.round(heightCm * 9), 110, 260),
    widthPx: clamp(Math.round(thicknessCm * 16), 22, 70),
  };
}

// 本棚のパステルカラーパレットの中から、本ごとにトーンを割り当てる(決定論的)
const SHELF_TONES = ["#8b7355", "#c98a7d", "#4a5568", "#94ab7f", "#d4a53f", "#c1654f", "#8fa8bf"];
function naturalTone(title) {
  return SHELF_TONES[hashStr(title) % SHELF_TONES.length];
}

function groupShelfItems(items) {
  const groups = new Map();
  items.forEach((item) => {
    const category = item.book.category || "未分類";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  });
  const categoryOrder = new Map(CATEGORY_OPTIONS.map((category, index) => [category.value, index]));
  return new Map([...groups.entries()].sort(([left], [right]) => {
    const leftOrder = categoryOrder.get(left) ?? CATEGORY_OPTIONS.length;
    const rightOrder = categoryOrder.get(right) ?? CATEGORY_OPTIONS.length;
    return leftOrder - rightOrder || left.localeCompare(right, "ja");
  }));
}

function createShelfIndexPlate(category, count) {
  const plate = el(`<div class="shelf-index-plate"><span class="shelf-index-label"></span><span class="shelf-index-count"></span></div>`);
  plate.querySelector(".shelf-index-label").textContent = category;
  plate.querySelector(".shelf-index-count").textContent = `${count}冊`;
  return plate;
}

function buildGridView(items) {
  const wrapper = el(`<div class="shelf-category-list"></div>`);
  groupShelfItems(items).forEach((categoryItems, category) => {
    const section = el(`<section class="shelf-category-section"><div class="shelf-grid"></div></section>`);
    section.prepend(createShelfIndexPlate(category, categoryItems.length));
    const grid = section.querySelector(".shelf-grid");
    categoryItems.forEach(({ book, holding, ai }) => {
      const curry = analyzeBook(book, {}, state.books).curry;
      const btn = el(`<button class="book" style="background:${naturalTone(book.title)};">
        <div><b>${book.title}</b></div>
        <div>${ai ? '<span class="tag ai">✨ 類似候補</span>' : holdingBadges(holding)}<span class="tag curry">${CURRY_LABEL[curry.curryType]}</span></div>
      </button>`);
      btn.addEventListener("click", () => setView("detail", { bookId: book.id, holdingId: holding ? holding.id : null }));
      grid.appendChild(btn);
    });
    wrapper.appendChild(section);
  });
  return wrapper;
}

function buildSpineView(items) {
  const wrapper = document.createElement("div");
  groupShelfItems(items).forEach((categoryItems, category) => {
    const section = el(`<section class="shelf-category-section spine-category-section"><div class="spine-shelf-outer"><div class="spine-shelf"></div></div></section>`);
    section.prepend(createShelfIndexPlate(category, categoryItems.length));
    const shelf = section.querySelector(".spine-shelf");
    categoryItems.forEach(({ book, holding }) => {
      const { heightPx, widthPx } = spineDimensions(book);
      const label = book.title.length > 16 ? book.title.slice(0, 16) + "…" : book.title;
      const btn = el(`<button class="spine" title="${book.title}(高さ${book.physicalHeight || "?"}cm/厚さ${book.physicalLength || "?"}cm)"
        style="height:${heightPx}px;width:${widthPx}px;background:${naturalTone(book.title)};">${label}</button>`);
      btn.addEventListener("click", () => setView("detail", { bookId: book.id, holdingId: holding ? holding.id : null }));
      shelf.appendChild(btn);
    });
    wrapper.appendChild(section);
  });
  wrapper.appendChild(el(`<p class="spine-caption">📏 本の実際の高さ・厚さに応じてサイズを変えて表示しています(サイズ未登録の本は標準サイズ)</p>`));
  return wrapper;
}

function sortShelfHoldings(holdings, sortBy) {
  return holdings.slice().sort((left, right) => {
    const a = bookById(left.bookId);
    const b = bookById(right.bookId);
    if (!a || !b) return 0;
    if (sortBy === "TITLE_DESC") return b.title.localeCompare(a.title, "ja");
    if (sortBy === "READING_LOW" || sortBy === "READING_HIGH") {
      const aScore = analyzeBook(a, {}, state.books).readingLoadScore;
      const bScore = analyzeBook(b, {}, state.books).readingLoadScore;
      return sortBy === "READING_LOW" ? aScore - bScore : bScore - aScore;
    }
    if (sortBy === "STATUS") {
      const statusOrder = { AVAILABLE: 0, ON_LOAN: 1, UNAVAILABLE: 2 };
      return (statusOrder[left.status] ?? 9) - (statusOrder[right.status] ?? 9) || a.title.localeCompare(b.title, "ja");
    }
    return a.title.localeCompare(b.title, "ja");
  });
}

function renderShelf() {
  const wrap = el(`<div>
    <h2>本棚</h2>
    <div class="shelf-toggle">
      <button data-mode="grid">標準表示</button>
      <button data-mode="size">実寸表示</button>
    </div>
    <div class="card shelf-controls">
      <label for="searchBox">書籍検索</label>
      <input id="searchBox" placeholder="🔍 タイトル・ISBNで検索(該当なしの場合はAI類似候補を表示)">
      <div class="shelf-filter-grid">
        <div><label for="holdingTypeFilter">所有区分</label><select id="holdingTypeFilter"><option value="ALL">すべて</option><option value="COMPANY">会社所有</option><option value="PERSONAL">私物</option></select></div>
        <div><label for="statusFilter">貸出状態</label><select id="statusFilter"><option value="ALL">すべて</option><option value="AVAILABLE">在庫</option><option value="ON_LOAN">貸出中</option><option value="UNAVAILABLE">利用不可</option></select></div>
        <div><label for="categoryFilter">カテゴリ</label><select id="categoryFilter"><option value="ALL">すべて</option>${CATEGORY_OPTIONS.map((c) => `<option value="${c.value}">${c.value}</option>`).join("")}</select></div>
        <div><label for="sortBy">カテゴリ内の並び順</label><select id="sortBy"><option value="TITLE_ASC">書名 昇順</option><option value="TITLE_DESC">書名 降順</option><option value="READING_LOW">Reading Loadが低い順</option><option value="READING_HIGH">Reading Loadが高い順</option><option value="STATUS">貸出可能な順</option></select></div>
      </div>
      <div class="shelf-filter-footer"><span id="resultCount" class="note"></span><button class="btn secondary small" id="resetShelfFilters" type="button">条件をクリア</button></div>
    </div>
    <div class="card"><div id="resultArea"></div></div>
    <button class="btn" id="newBookBtn">＋ 新しい本を登録</button>
  </div>`);

  const resultArea = wrap.querySelector("#resultArea");
  const toggleButtons = wrap.querySelectorAll(".shelf-toggle button");
  function syncToggle() {
    toggleButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === shelfDisplayMode));
  }
  toggleButtons.forEach((b) => b.addEventListener("click", () => {
    shelfDisplayMode = b.dataset.mode;
    syncToggle();
    draw(wrap.querySelector("#searchBox").value);
  }));
  syncToggle();

  function visibleHoldings() {
    const holdingType = wrap.querySelector("#holdingTypeFilter").value;
    const status = wrap.querySelector("#statusFilter").value;
    const category = wrap.querySelector("#categoryFilter").value;
    return state.holdings.filter((h) => {
      const book = bookById(h.bookId);
      return isHoldingVisibleTo(h, state.currentUser)
        && (holdingType === "ALL" || h.holdingType === holdingType)
        && (status === "ALL" || h.status === status)
        && (category === "ALL" || (book && book.category === category));
    });
  }

  function renderItems(items) {
    return shelfDisplayMode === "size" ? buildSpineView(items) : buildGridView(items);
  }

  function draw(filter) {
    resultArea.innerHTML = "";
    const f = (filter || "").trim().toLowerCase();
    const holdings = sortShelfHoldings(visibleHoldings(), wrap.querySelector("#sortBy").value);
    let matched = holdings.filter((h) => {
      const b = bookById(h.bookId);
      if (!b) return false;
      return !f || b.title.toLowerCase().includes(f) || b.isbn.includes(f);
    });

    if (matched.length > 0 || !f) {
      const items = matched.map((h) => ({ book: bookById(h.bookId), holding: h }));
      wrap.querySelector("#resultCount").textContent = `${items.length}冊を表示`;
      resultArea.appendChild(renderItems(items));
      if (matched.length === 0) resultArea.appendChild(el(`<p class="note">該当する本がありません</p>`));
      return;
    }

    // 通常検索0件 → AI類似候補
    const similar = findSimilarBooksMock(f, state.books.filter((b) => holdings.some((h) => h.bookId === b.id)));
    wrap.querySelector("#resultCount").textContent = "通常検索 0冊";
    resultArea.appendChild(el(`<p class="note">通常検索: 0件</p>`));
    if (similar.length === 0) {
      resultArea.appendChild(el(`<p class="note">類似する登録書籍は見つかりませんでした。</p>`));
    } else {
      resultArea.appendChild(el(`<p><span class="tag ai">✨ AIによる類似候補</span></p>`));
      const items = similar.map(({ book }) => ({ book, holding: holdings.find((x) => x.bookId === book.id), ai: true }));
      resultArea.appendChild(renderItems(items));
    }
  }
  draw("");
  wrap.querySelector("#searchBox").addEventListener("input", (e) => draw(e.target.value));
  wrap.querySelectorAll("#holdingTypeFilter, #statusFilter, #categoryFilter, #sortBy").forEach((control) => control.addEventListener("change", () => draw(wrap.querySelector("#searchBox").value)));
  wrap.querySelector("#resetShelfFilters").addEventListener("click", () => {
    wrap.querySelector("#searchBox").value = "";
    wrap.querySelector("#holdingTypeFilter").value = "ALL";
    wrap.querySelector("#statusFilter").value = "ALL";
    wrap.querySelector("#categoryFilter").value = "ALL";
    wrap.querySelector("#sortBy").value = "TITLE_ASC";
    draw("");
  });
  wrap.querySelector("#newBookBtn").addEventListener("click", () => setView("register"));
  return wrap;
}

// ---------- 書籍詳細 ----------
function bookCoverPlaceholder(book) {
  return `<div class="book-cover-placeholder" style="--cover-tone:${naturalTone(book.title)}" role="img" aria-label="表紙画像未設定の本">
    <svg class="book-cover-placeholder-icon" viewBox="0 0 120 150" aria-hidden="true">
      <path class="cover-shadow" d="M26 15h69a10 10 0 0 1 10 10v108H36a10 10 0 0 0-10 10z"/>
      <path class="cover-body" d="M20 10h69a10 10 0 0 1 10 10v108H30a10 10 0 0 0-10 10z"/>
      <path class="cover-line" d="M20 10h69a10 10 0 0 1 10 10v108H30a10 10 0 0 0-10 10V20a10 10 0 0 0-10-10zM32 10v118"/>
      <path class="cover-page" d="M32 128h67M32 134h62M32 140h58"/>
      <path class="cover-emblem" d="M47 55c9-4 17-2 22 3v31c-5-5-13-7-22-3zm44 0c-9-4-17-2-22 3v31c5-5 13-7 22-3z"/>
      <path class="cover-bookmark" d="M82 10v25l6-5 6 5V11"/>
    </svg>
    <span>表紙画像<small>未設定</small></span>
  </div>`;
}

function renderDetail() {
  const { bookId, holdingId } = currentParam || {};
  const book = bookById(bookId);
  if (!book) return el(`<div><p class="note">本が見つかりません</p></div>`);
  const holdings = state.holdings.filter((h) => h.bookId === book.id && isHoldingVisibleTo(h, state.currentUser));
  const holding = holdingById(holdingId) || holdings[0];

  const flags = {}; // 詳細画面では登録時のflagsは保持しないため、簡易にcategoryのみで再分析
  const analysis = analyzeBook(book, flags, state.books);
  const reviews = state.reviews.filter((r) => r.bookId === book.id);
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const bookmark = state.bookmarks[book.id];

  const activeLoan = holding ? state.loans.find((l) => l.holdingId === holding.id && l.status === "ACTIVE") : null;
  const pendingBorrowRequests = holding ? state.borrowRequests.filter((r) => r.holdingId === holding.id && (r.status === "PENDING" || r.status === "APPROVED")) : [];

  const wrap = el(`<div>
    <div class="back-link" id="backBtn">← 本棚に戻る</div>
    <h2>${book.title}</h2>

    <div class="card row book-summary">
      <div class="book-cover-column">${bookCoverPlaceholder(book)}</div>
      <div>
        <span class="tag">ISBN: ${book.isbn}</span>
        <span class="tag">${book.category || "-"}</span>
        <span class="tag curry">${CURRY_LABEL[analysis.curry.curryType]} ${spiceLevelFromScore(analysis.readingLoadScore).chili}${spiceLevelFromScore(analysis.readingLoadScore).label}</span><br>
        <span class="tag">🧠 Reading Load ${analysis.readingLoadScore}/100</span>
        ${analysis.physicalLoadScore != null ? `<span class="tag">💪 Physical Load ${analysis.physicalLoadScore}/100</span>` : ""}
        ${avgRating ? `<span class="tag">★${avgRating}(${reviews.length}件)</span>` : `<span class="tag">レビューなし</span>`}
        <p>${book.description || ""}</p>
        <p class="note">サイズ: ${book.physicalHeight ? `${book.physicalHeight}x${book.physicalWidth}x${book.physicalLength}${book.physicalDimensionUnit || "cm"}` : "不明"} / 重量: ${book.physicalWeight ? `${book.physicalWeight}${book.physicalWeightUnit || "g"}` : "不明"}(${book.physicalInfoSource || "未取得"})</p>
        <button class="btn" id="editBtn">編集</button>
        <button class="btn danger" id="deleteBtn">削除</button>
      </div>
    </div>

    <div class="card">
      <b>🍛 読書カレー(AIコメント)</b>
      <p>${analysis.curry.reason}</p>
      <div>トッピング: ${analysis.curry.toppings.length ? analysis.curry.toppings.map((t) => `<span class="tag">${TOPPING_LABEL[t]}</span>`).join("") : "なし"}</div>
      <p class="note">科学的評価ではなく、アプリ独自の楽しい指標です(Mock)。</p>
    </div>

    <div class="card">
      <b>参考カロリー(Mock・参考値)</b>
      <div class="row">
        <div>
          <label>持ち運び時間(分)</label>
          <input type="number" id="carryMinutes" placeholder="10">
          <button class="btn small" id="carryBtn" type="button">概算する</button>
          <p class="note" id="carryResult"></p>
        </div>
        <div>
          <p class="note">🧠 読書中の脳エネルギー参考値: ${analysis.referenceBrainCalories != null ? analysis.referenceBrainCalories + "kcal相当(推定読書時間" + analysis.estimatedReadingMinutes + "分から算出)" : "ページ数未登録のため算出不可"}</p>
          <p class="note">※難易度(Reading Load)を消費カロリーの倍率には使用していません。</p>
        </div>
      </div>
    </div>

    <div class="card">
      <b>この本の所蔵(Holding)一覧</b>
      <div id="holdingList"></div>
    </div>

    ${holding ? `
    <div class="card">
      <b>選択中の所蔵：${holding.holdingType === "COMPANY" ? "会社所有" : "私物(" + holding.ownerDisplayName + ")"}</b><br>
      ${holdingBadges(holding)}
      <p class="note">現所持者: ${holding.currentHolderDisplayName || "-"}</p>
      <div id="loanAction"></div>
      <div id="borrowRequestList"></div>
    </div>
    ` : ""}

    <div class="card">
      <b>レビュー</b>
      <div id="reviewList"></div>
      <div class="row">
        <div><label>評価</label><select id="reviewRating"><option>5</option><option>4</option><option selected>3</option><option>2</option><option>1</option></select></div>
        <div><label>コメント</label><input id="reviewComment" placeholder="感想を入力"></div>
      </div>
      <button class="btn" id="addReviewBtn">レビュー投稿</button>
    </div>

    <div class="card">
      <b>AIしおり自動生成(Mock)</b>
      <div class="row">
        <div><label>ロゴ文字</label><input id="logoText" value="${bookmark ? bookmark.logoText : "○○株式会社"}"></div>
        <div><label>ロゴ位置</label>
          <select id="logoPosition">
            ${["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"].map((p) => `<option value="${p}" ${bookmark && bookmark.logoPosition === p ? "selected" : ""}>${{ TOP_LEFT: "左上", TOP_RIGHT: "右上", BOTTOM_LEFT: "左下", BOTTOM_RIGHT: "右下" }[p]}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="bookmarkArea"></div>
      <button class="btn" id="genBookmarkBtn">${bookmark ? "しおりを再生成" : "しおりを生成"}</button>
      <button class="btn secondary" id="printBookmarkBtn" ${bookmark ? "" : "disabled"}>印刷</button>
    </div>
  </div>`);

  wrap.querySelector("#backBtn").addEventListener("click", () => setView("shelf"));
  wrap.querySelector("#editBtn").addEventListener("click", () => setView("register", { bookId: book.id }));
  wrap.querySelector("#deleteBtn").addEventListener("click", () => {
    if (confirm(`「${book.title}」を削除しますか？(関連する所蔵情報も削除されます)`)) {
      state.books = state.books.filter((b) => b.id !== book.id);
      state.holdings = state.holdings.filter((h) => h.bookId !== book.id);
      saveState(state);
      setView("shelf");
    }
  });

  // 所蔵一覧
  function drawHoldings() {
    const list = wrap.querySelector("#holdingList");
    list.innerHTML = holdings.map((h) => `
      <div class="list-item">
        ${h.holdingType === "COMPANY" ? "会社所有" : "私物(" + h.ownerDisplayName + ")"} - ${holdingBadges(h)}
        現所持者: ${h.currentHolderDisplayName || "-"}
        ${h.id === (holding && holding.id) ? '<span class="tag">選択中</span>' : `<button class="btn small" data-select="${h.id}">選択</button>`}
      </div>`).join("") || `<p class="note">所蔵がありません</p>`;
    list.querySelectorAll("[data-select]").forEach((b) => b.addEventListener("click", () => setView("detail", { bookId: book.id, holdingId: b.dataset.select })));
  }
  drawHoldings();

  // 貸出/貸出依頼アクション
  if (holding) {
    const actionArea = wrap.querySelector("#loanAction");
    if (holding.status === "AVAILABLE") {
      actionArea.innerHTML = `<button class="btn" id="borrowNowBtn">この本を借りる</button>`;
      actionArea.querySelector("#borrowNowBtn").addEventListener("click", () => {
        const start = todayStr();
        state.loans.push({ id: uid(), holdingId: holding.id, borrowerId: state.currentUser, borrowedAt: start, dueAt: addDays(start, 14), returnedAt: null, status: "ACTIVE" });
        holding.status = "ON_LOAN";
        holding.currentHolderId = state.currentUser;
        holding.currentHolderDisplayName = state.currentUser;
        saveState(state);
        render();
      });
    } else if (holding.status === "ON_LOAN" && holding.currentHolderId !== state.currentUser) {
      if (!isHoldingLoanable(holding)) {
        actionArea.innerHTML = `<p class="note">この所蔵は貸出不可に設定されています</p>`;
      } else {
        const already = state.borrowRequests.find((r) => r.holdingId === holding.id && r.requesterId === state.currentUser && r.status === "PENDING");
        actionArea.innerHTML = already
          ? `<p class="note">貸出依頼を送信済みです(承認待ち)</p>`
          : `<label>依頼メッセージ</label><textarea id="borrowMsg" rows="2" placeholder="次に借りたいです"></textarea><button class="btn" id="borrowReqBtn">次に借りたい(貸出依頼)</button>`;
        const btn = actionArea.querySelector("#borrowReqBtn");
        if (btn) btn.addEventListener("click", () => {
          state.borrowRequests.push({
            id: uid(), holdingId: holding.id, requesterId: state.currentUser, requesterDisplayName: state.currentUser,
            requestedToUserId: holding.currentHolderId, message: actionArea.querySelector("#borrowMsg").value.trim(),
            requestedAt: todayStr(), respondedAt: null, status: "PENDING",
          });
          saveState(state); render();
        });
      }
    } else if (holding.currentHolderId === state.currentUser) {
      actionArea.innerHTML = `<p class="note">現在あなたが所持しています。返却・リレーは「貸出・返却」「リレー」タブから操作できます。</p>`;
    }

    const brList = wrap.querySelector("#borrowRequestList");
    if (pendingBorrowRequests.length) {
      brList.innerHTML = `<p class="note">貸出待ち：${pendingBorrowRequests.map((r) => `${r.requesterDisplayName}(${r.status === "APPROVED" ? "承認済み" : "申請中"})`).join(" → ")}</p>`;
    }
  }

  // カロリー概算
  wrap.querySelector("#carryBtn").addEventListener("click", () => {
    const minutes = Number(wrap.querySelector("#carryMinutes").value) || 0;
    const weightG = book.physicalWeight || 300;
    const calories = Math.round(minutes * (weightG / 1000) * 0.6);
    wrap.querySelector("#carryResult").textContent = `📦 持ち運び参考カロリー: 約${calories}kcal(書籍重量${weightG}gを${minutes}分持ち運んだ場合の概算)`;
  });

  // レビュー
  function drawReviews() {
    wrap.querySelector("#reviewList").innerHTML = reviews.map((r) => `<div class="list-item">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} ${r.comment} - ${r.reviewerId}</div>`).join("") || `<p class="note">レビューはまだありません</p>`;
  }
  drawReviews();
  wrap.querySelector("#addReviewBtn").addEventListener("click", () => {
    const rating = Number(wrap.querySelector("#reviewRating").value);
    const comment = wrap.querySelector("#reviewComment").value.trim();
    if (!comment) { alert("コメントを入力してください"); return; }
    state.reviews.push({ id: uid(), bookId: book.id, reviewerId: state.currentUser, rating, comment, createdAt: todayStr() });
    saveState(state); render();
  });

  // AIしおり
  function drawBookmark() {
    const area = wrap.querySelector("#bookmarkArea");
    area.innerHTML = bookmark ? `<img src="${bookmark.imageDataUrl}" style="max-width:220px;display:block;border:1px solid var(--line);border-radius:6px;">` : `<p class="note">まだ生成されていません</p>`;
  }
  drawBookmark();
  wrap.querySelector("#genBookmarkBtn").addEventListener("click", () => {
    const logoText = wrap.querySelector("#logoText").value.trim() || "○○株式会社";
    const logoPosition = wrap.querySelector("#logoPosition").value;
    const imageDataUrl = generateBookmarkImageMock(book, logoText, logoPosition);
    state.bookmarks[book.id] = { imageDataUrl, logoText, logoPosition, createdAt: todayStr() };
    saveState(state); render();
  });
  wrap.querySelector("#printBookmarkBtn").addEventListener("click", () => {
    const bm = state.bookmarks[book.id];
    if (!bm) return;
    const w = window.open("", "_blank");
    w.document.write(`<img src="${bm.imageDataUrl}" style="width:100%;">`);
    w.document.close();
    w.focus();
    w.print();
  });

  return wrap;
}

// AIしおり生成Mock(Canvas)。会社ロゴは画像ではなく利用者指定の文字列をアプリ側で合成する。
function generateBookmarkImageMock(book, logoText, logoPosition) {
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  const bookmarkHue = 25 + (hashStr(book.title) % 40); // 木目・パステルの範囲内で揺らす
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, `hsl(${bookmarkHue}, 45%, 78%)`);
  grad.addColorStop(1, `hsl(${bookmarkHue}, 35%, 35%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  wrapText(ctx, book.title, 16, 60, canvas.width - 32, 24);
  ctx.font = "13px sans-serif";
  ctx.globalAlpha = 0.9;
  wrapText(ctx, book.description || "", 16, 140, canvas.width - 32, 20);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height - 140, 60, 0, Math.PI * 2);
  ctx.fill();

  // ロゴ文字(利用者指定)をアプリ側で安全余白に合成
  ctx.font = "bold 12px sans-serif";
  const textWidth = ctx.measureText(logoText).width;
  const padX = 10, padY = 8, boxW = textWidth + 16, boxH = 24;
  let bx, by;
  if (logoPosition === "TOP_LEFT") { bx = padX; by = padY; }
  else if (logoPosition === "TOP_RIGHT") { bx = canvas.width - boxW - padX; by = padY; }
  else if (logoPosition === "BOTTOM_LEFT") { bx = padX; by = canvas.height - boxH - padY; }
  else { bx = canvas.width - boxW - padX; by = canvas.height - boxH - padY; }
  ctx.fillStyle = "#2a2622";
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(logoText, bx + boxW / 2, by + boxH / 2 + 4);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = "", curY = y;
  for (const ch of (text || "").split("")) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, curY); line = ch; curY += lineHeight; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, curY);
}

// ---------- 登録・編集 ----------
function renderRegister() {
  const editingBookId = currentParam && currentParam.bookId;
  const editing = editingBookId ? bookById(editingBookId) : null;

  const wrap = el(`<div>
    <h2>${editing ? "書籍編集" : "新しい本を登録"}</h2>
    <div class="card">
      <label>ISBN</label>
      <div class="row">
        <div><input id="fIsbn" value="${editing ? editing.isbn : ""}" placeholder="978-4-xxxxxxxx"></div>
        <div style="max-width:200px"><button class="btn secondary" id="fetchIsbnBtn" type="button">ISBN書誌情報取得(Mock)</button></div>
      </div>
      <p class="note">※本セッションでは実際の外部API接続は行わず、擬似データで自動入力します</p>

      <label>書籍名</label><input id="fTitle" value="${editing ? editing.title : ""}">
      <label>著者</label><input id="fAuthors" value="${editing ? editing.authors || "" : ""}">
      <label>出版社</label><input id="fPublisher" value="${editing ? editing.publisher || "" : ""}">
      <label>あらすじ</label><textarea id="fDescription" rows="3">${editing ? editing.description || "" : ""}</textarea>
      <div class="row">
        <div><label>カテゴリ(読書カレーの種類判定に利用)</label>
          <select id="fCategory">${CATEGORY_OPTIONS.map((c) => `<option value="${c.value}" ${editing && editing.category === c.value ? "selected" : ""}>${c.value}</option>`).join("")}</select>
        </div>
        <div><label>ページ数</label><input id="fPageCount" type="number" value="${editing ? editing.pageCount || "" : ""}"></div>
      </div>

      <label>内容の特徴(読書カレーのトッピング・辛さに反映)</label>
      <div class="checkbox-row"><input type="checkbox" id="fDiagram"><label for="fDiagram" style="margin:0">図解・イラストが多い</label></div>
      <div class="checkbox-row"><input type="checkbox" id="fBeginner"><label for="fBeginner" style="margin:0">初心者向けの解説が丁寧</label></div>
      <div class="checkbox-row"><input type="checkbox" id="fExample"><label for="fExample" style="margin:0">実例・サンプルコードが豊富</label></div>
      <div class="checkbox-row"><input type="checkbox" id="fExpert"><label for="fExpert" style="margin:0">専門用語・数式が多い</label></div>

      <div class="row">
        <div><label>サイズ(高さcm)</label><input id="fHeight" type="number" value="${editing ? editing.physicalHeight || "" : ""}"></div>
        <div><label>重量(g)</label><input id="fWeight" type="number" value="${editing ? editing.physicalWeight || "" : ""}"></div>
        <div style="max-width:220px"><label>&nbsp;</label><button class="btn secondary" id="fetchProductBtn" type="button">商品情報取得(Mock)</button></div>
      </div>
      <label>金額</label><input id="fPrice" type="number" value="${editing ? editing.price || "" : ""}">
      <button class="btn" id="saveBookBtn">${editing ? "書籍情報を保存" : "書籍を登録して所蔵(Holding)も作成"}</button>
      <button class="btn secondary" id="cancelBtn">キャンセル</button>
    </div>

    ${!editing ? `
    <div class="card">
      <b>所蔵(Holding)情報</b>
      <div class="row">
        <div><label>所有区分</label><select id="hType"><option value="COMPANY">会社所有</option><option value="PERSONAL">私物</option></select></div>
        <div id="ownerField" style="display:none"><label>所有者(私物の場合)</label><select id="hOwner">${getKnownUsers().map((u) => `<option ${u === state.currentUser ? "selected" : ""}>${u}</option>`).join("")}</select></div>
      </div>
      <div id="visibilityField" style="display:none">
        <label>公開範囲(私物の場合)</label>
        <select id="hVisibility">
          <option value="PRIVATE">非公開(自分のみ)</option>
          <option value="INTERNAL_VISIBLE">社内検索に表示</option>
          <option value="LOAN_AVAILABLE" selected>社内検索表示＋貸出可能</option>
        </select>
      </div>
      <label>保管場所</label><input id="hLocation" placeholder="例: 本棚A、自席">
    </div>` : ""}
  </div>`);

  if (!editing) {
    const hType = wrap.querySelector("#hType");
    const ownerField = wrap.querySelector("#ownerField");
    const visibilityField = wrap.querySelector("#visibilityField");
    function syncFields() {
      const isPersonal = hType.value === "PERSONAL";
      ownerField.style.display = isPersonal ? "" : "none";
      visibilityField.style.display = isPersonal ? "" : "none";
    }
    hType.addEventListener("change", syncFields);
    syncFields();
  }

  wrap.querySelector("#fetchIsbnBtn").addEventListener("click", () => {
    const isbn = wrap.querySelector("#fIsbn").value || "0000000000";
    const info = fetchBookInfoMock(isbn);
    wrap.querySelector("#fTitle").value = info.title;
    wrap.querySelector("#fAuthors").value = info.authors;
    wrap.querySelector("#fPublisher").value = info.publisher;
    wrap.querySelector("#fDescription").value = info.description;
    wrap.querySelector("#fCategory").value = info.category;
    wrap.querySelector("#fPageCount").value = info.pageCount;
  });
  wrap.querySelector("#fetchProductBtn").addEventListener("click", () => {
    const isbn = wrap.querySelector("#fIsbn").value || "0000000000";
    const info = fetchProductInfoMock(isbn);
    wrap.querySelector("#fHeight").value = info.physicalHeight;
    wrap.querySelector("#fWeight").value = info.physicalWeight;
  });

  wrap.querySelector("#cancelBtn").addEventListener("click", () => setView(editing ? "detail" : "shelf", editing ? { bookId: editing.id } : null));

  wrap.querySelector("#saveBookBtn").addEventListener("click", () => {
    const title = wrap.querySelector("#fTitle").value.trim();
    if (!title) { alert("書籍名を入力してください"); return; }
    const data = {
      isbn: wrap.querySelector("#fIsbn").value.trim(),
      title,
      authors: wrap.querySelector("#fAuthors").value.trim(),
      publisher: wrap.querySelector("#fPublisher").value.trim(),
      description: wrap.querySelector("#fDescription").value.trim(),
      category: wrap.querySelector("#fCategory").value,
      pageCount: Number(wrap.querySelector("#fPageCount").value) || null,
      physicalHeight: Number(wrap.querySelector("#fHeight").value) || null,
      physicalWeight: Number(wrap.querySelector("#fWeight").value) || null,
      physicalDimensionUnit: "cm",
      physicalWeightUnit: "g",
      physicalInfoSource: wrap.querySelector("#fHeight").value || wrap.querySelector("#fWeight").value ? "MANUAL" : null,
      price: Number(wrap.querySelector("#fPrice").value) || 0,
    };

    if (editing) {
      Object.assign(editing, data);
      saveState(state);
      setView("detail", { bookId: editing.id });
      return;
    }

    const book = { id: uid(), ...data };
    state.books.push(book);

    const holdingType = wrap.querySelector("#hType").value;
    const isPersonal = holdingType === "PERSONAL";
    const owner = isPersonal ? wrap.querySelector("#hOwner").value : null;
    const visibility = isPersonal ? wrap.querySelector("#hVisibility").value : "LOAN_AVAILABLE";
    const holding = {
      id: uid(), bookId: book.id, holdingType,
      ownerId: isPersonal ? owner : null,
      ownerDisplayName: isPersonal ? owner : "会社",
      location: wrap.querySelector("#hLocation").value.trim(),
      visibility, loanAllowed: !isPersonal || visibility === "LOAN_AVAILABLE",
      currentHolderId: isPersonal ? owner : state.currentUser,
      currentHolderDisplayName: isPersonal ? owner : state.currentUser,
      status: "AVAILABLE", availableFrom: null,
    };
    state.holdings.push(holding);
    saveState(state);
    setView("detail", { bookId: book.id, holdingId: holding.id });
  });

  return wrap;
}

// ---------- 貸出・返却・貸出待ち ----------
function renderLoan() {
  const wrap = el(`<div>
    <h2>貸出・返却・貸出待ち</h2>
    <div class="card">
      <b>あなたへの貸出依頼</b>
      <div id="incomingRequests"></div>
    </div>
    <div class="card">
      <b>あなたが送った貸出依頼</b>
      <div id="myRequests"></div>
    </div>
    <div class="card">
      <b>貸出中一覧</b>
      <div id="activeLoans"></div>
    </div>
    <div class="card">
      <b>貸出履歴</b>
      <div id="loanHistory"></div>
    </div>
  </div>`);

  function fulfillIfApproved(holding) {
    const approved = state.borrowRequests
      .filter((r) => r.holdingId === holding.id && r.status === "APPROVED")
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))[0];
    if (approved) {
      const start = todayStr();
      state.loans.push({ id: uid(), holdingId: holding.id, borrowerId: approved.requesterId, borrowedAt: start, dueAt: addDays(start, 14), returnedAt: null, status: "ACTIVE" });
      holding.status = "ON_LOAN";
      holding.currentHolderId = approved.requesterId;
      holding.currentHolderDisplayName = approved.requesterDisplayName;
      approved.status = "FULFILLED";
      approved.respondedAt = start;
    } else {
      holding.status = "AVAILABLE";
      holding.currentHolderId = holding.ownerId || holding.currentHolderId;
      holding.currentHolderDisplayName = holding.ownerDisplayName || holding.currentHolderDisplayName;
    }
  }

  function draw() {
    const incoming = state.borrowRequests.filter((r) => r.requestedToUserId === state.currentUser && r.status === "PENDING")
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    wrap.querySelector("#incomingRequests").innerHTML = incoming.map((r) => {
      const h = holdingById(r.holdingId); const b = h ? bookById(h.bookId) : null;
      return `<div class="list-item">
        「${b ? b.title : "?"}」を ${r.requesterDisplayName}さんが希望(${r.requestedAt}) ${r.message ? "「" + r.message + "」" : ""}
        <button class="btn small" data-approve="${r.id}">承認</button>
        <button class="btn danger small" data-reject="${r.id}">拒否</button>
      </div>`;
    }).join("") || `<p class="note">あなたへの依頼はありません</p>`;
    wrap.querySelectorAll("[data-approve]").forEach((btn) => btn.addEventListener("click", () => {
      const r = state.borrowRequests.find((x) => x.id === btn.dataset.approve);
      r.status = "APPROVED"; r.respondedAt = todayStr();
      saveState(state); render();
    }));
    wrap.querySelectorAll("[data-reject]").forEach((btn) => btn.addEventListener("click", () => {
      const r = state.borrowRequests.find((x) => x.id === btn.dataset.reject);
      r.status = "REJECTED"; r.respondedAt = todayStr();
      saveState(state); render();
    }));

    const mine = state.borrowRequests.filter((r) => r.requesterId === state.currentUser && (r.status === "PENDING" || r.status === "APPROVED"));
    wrap.querySelector("#myRequests").innerHTML = mine.map((r) => {
      const h = holdingById(r.holdingId); const b = h ? bookById(h.bookId) : null;
      return `<div class="list-item">「${b ? b.title : "?"}」 <span class="tag">${r.status === "APPROVED" ? "承認済み・返却待ち" : "申請中"}</span>
        ${r.status === "PENDING" ? `<button class="btn danger small" data-cancel="${r.id}">キャンセル</button>` : ""}
      </div>`;
    }).join("") || `<p class="note">送信中の依頼はありません</p>`;
    wrap.querySelectorAll("[data-cancel]").forEach((btn) => btn.addEventListener("click", () => {
      const r = state.borrowRequests.find((x) => x.id === btn.dataset.cancel);
      r.status = "CANCELLED"; r.respondedAt = todayStr();
      saveState(state); render();
    }));

    const active = state.loans.filter((l) => l.status === "ACTIVE");
    const history = state.loans.filter((l) => l.status === "RETURNED");
    wrap.querySelector("#activeLoans").innerHTML = active.map((l) => {
      const h = holdingById(l.holdingId); const b = h ? bookById(h.bookId) : null;
      const overdue = daysBetween(l.dueAt, todayStr()) > 0;
      const waitCount = h ? state.borrowRequests.filter((r) => r.holdingId === h.id && (r.status === "PENDING" || r.status === "APPROVED")).length : 0;
      return `<div class="list-item">
        ${b ? b.title : "?"} - ${l.borrowerId} (${l.borrowedAt}〜${l.dueAt})
        ${overdue ? `<span class="tag overdue">期限超過 ${daysBetween(l.dueAt, todayStr())}日・催促対象</span>` : ""}
        ${waitCount ? `<span class="tag">貸出待ち ${waitCount}人</span>` : ""}
        ${l.borrowerId === state.currentUser ? `<button class="btn secondary small" data-return="${l.id}">返却</button>` : ""}
      </div>`;
    }).join("") || `<p class="note">貸出中の本はありません</p>`;
    wrap.querySelectorAll("[data-return]").forEach((btn) => btn.addEventListener("click", () => {
      const loan = state.loans.find((l) => l.id === btn.dataset.return);
      loan.returnedAt = todayStr(); loan.status = "RETURNED";
      const h = holdingById(loan.holdingId);
      if (h) fulfillIfApproved(h);
      saveState(state); render();
    }));

    wrap.querySelector("#loanHistory").innerHTML = history.map((l) => {
      const h = holdingById(l.holdingId); const b = h ? bookById(h.bookId) : null;
      return `<div class="list-item">${b ? b.title : "?"} - ${l.borrowerId} (${l.borrowedAt}〜${l.returnedAt}) 返却済</div>`;
    }).join("") || `<p class="note">履歴はありません</p>`;
  }
  draw();
  return wrap;
}

// ---------- リレー(バトン読書) ----------
function renderRelay() {
  const myHoldings = state.holdings.filter((h) => h.currentHolderId === state.currentUser);
  const pending = state.relayRequests.filter((r) => r.toUserId === state.currentUser && r.status === "PENDING");

  const wrap = el(`<div>
    <h2>リレー(バトン読書)</h2>
    <p class="note">現在読んでいる本を、次に読んでほしい人へ推薦できます(Push型)。「次に借りたい」の貸出待ちがある本は、順番を飛ばさないためリレーできません。</p>

    <div class="card">
      <b>あなた宛のリレー(受け取り待ち)</b>
      <div id="pendingList"></div>
    </div>

    <div class="card">
      <b>次の読者にリレーする</b>
      <label>本を選択(現在あなたが所持している本のみ)</label>
      <select id="relayHolding">${myHoldings.map((h) => { const b = bookById(h.bookId); return `<option value="${h.id}">${b ? b.title : "?"}</option>`; }).join("") || '<option value="">所持している本がありません</option>'}</select>
      <label>次に読んでほしい人</label>
      <select id="relayTo">${getKnownUsers().filter((u) => u !== state.currentUser).map((u) => `<option>${u}</option>`).join("")}</select>
      <label>メッセージ</label>
      <textarea id="relayMessage" rows="2" placeholder="この本オススメです！"></textarea>
      <button class="btn" id="relaySubmit" ${myHoldings.length ? "" : "disabled"}>リレーする</button>
      <p class="note" id="relayError" style="color:var(--danger)"></p>
    </div>

    <div class="card">
      <b>全体のリレー履歴</b>
      <div id="relayAll"></div>
    </div>
  </div>`);

  function drawPending() {
    wrap.querySelector("#pendingList").innerHTML = pending.map((r) => {
      const b = bookById(r.bookId);
      return `<div class="list-item">「${b ? b.title : "?"}」 ${r.fromUserDisplayName}さんから 「${r.message || ""}」
        <button class="btn small" data-accept="${r.id}">受け取る</button>
        <button class="btn danger small" data-decline="${r.id}">辞退する</button>
      </div>`;
    }).join("") || `<p class="note">受け取り待ちのリレーはありません</p>`;

    wrap.querySelectorAll("[data-accept]").forEach((btn) => btn.addEventListener("click", () => {
      const r = state.relayRequests.find((x) => x.id === btn.dataset.accept);
      r.status = "ACCEPTED"; r.respondedAt = todayStr();
      const h = holdingById(r.holdingId);
      if (h) {
        const activeLoan = state.loans.find((l) => l.holdingId === h.id && l.status === "ACTIVE");
        if (activeLoan) { activeLoan.status = "RETURNED"; activeLoan.returnedAt = todayStr(); }
        state.loans.push({ id: uid(), holdingId: h.id, borrowerId: r.toUserId, borrowedAt: todayStr(), dueAt: addDays(todayStr(), 14), returnedAt: null, status: "ACTIVE" });
        h.currentHolderId = r.toUserId; h.currentHolderDisplayName = r.toUserDisplayName; h.status = "ON_LOAN";
      }
      saveState(state); render();
    }));
    wrap.querySelectorAll("[data-decline]").forEach((btn) => btn.addEventListener("click", () => {
      const r = state.relayRequests.find((x) => x.id === btn.dataset.decline);
      r.status = "DECLINED"; r.respondedAt = todayStr();
      saveState(state); render();
    }));
  }
  drawPending();

  const submitBtn = wrap.querySelector("#relaySubmit");
  if (submitBtn) submitBtn.addEventListener("click", () => {
    const holdingId = wrap.querySelector("#relayHolding").value;
    const holding = holdingById(holdingId);
    if (!holding) return;
    const hasQueue = state.borrowRequests.some((r) => r.holdingId === holding.id && (r.status === "PENDING" || r.status === "APPROVED"));
    if (hasQueue) {
      wrap.querySelector("#relayError").textContent = "この本には既に貸出待ちがあるため、順番を飛ばしてリレーすることはできません。";
      return;
    }
    const to = wrap.querySelector("#relayTo").value;
    const message = wrap.querySelector("#relayMessage").value.trim();
    state.relayRequests.push({
      id: uid(), bookId: holding.bookId, holdingId: holding.id,
      fromUserId: state.currentUser, fromUserDisplayName: state.currentUser,
      toUserId: to, toUserDisplayName: to, message,
      createdAt: todayStr(), respondedAt: null, status: "PENDING",
    });
    saveState(state); render();
  });

  wrap.querySelector("#relayAll").innerHTML = state.relayRequests.slice().reverse().map((r) => {
    const b = bookById(r.bookId);
    return `<div class="list-item">「${b ? b.title : "?"}」 ${r.fromUserDisplayName} → ${r.toUserDisplayName} <span class="tag">${r.status}</span></div>`;
  }).join("") || `<p class="note">まだリレーのやり取りはありません</p>`;
  wrap.querySelector("#relayAll").parentElement.querySelector("b").insertAdjacentHTML("afterend", "");

  return wrap;
}

// ---------- 購入希望 ----------
function renderWishlist() {
  const wrap = el(`<div>
    <h2>購入希望リスト</h2>
    <div class="card">
      <label>ほしい本のタイトル/ISBN</label>
      <input id="wishTitle" placeholder="タイトルを入力">
      <label>理由(任意)</label>
      <input id="wishReason" placeholder="業務で必要、興味があるなど">
      <button class="btn" id="wishSubmit">希望を追加</button>
    </div>
    <div class="card"><div id="wishList"></div></div>
  </div>`);

  wrap.querySelector("#wishSubmit").addEventListener("click", () => {
    const title = wrap.querySelector("#wishTitle").value.trim();
    if (!title) return;
    const reason = wrap.querySelector("#wishReason").value.trim();
    state.purchaseRequests.push({ id: uid(), bookId: null, title, requesterId: state.currentUser, requestedAt: todayStr(), reason, priority: "NORMAL", status: "PENDING" });
    saveState(state); render();
  });

  function draw() {
    const byTitle = {};
    state.purchaseRequests.forEach((p) => {
      const key = p.title.toLowerCase();
      byTitle[key] = byTitle[key] || { title: p.title, requesters: [] };
      byTitle[key].requesters.push(p.requesterId);
    });
    wrap.querySelector("#wishList").innerHTML = Object.values(byTitle).map((w) => `
      <div class="list-item">${w.title} <span class="tag">希望者 ${w.requesters.length}名(${w.requesters.join("・")})</span></div>
    `).join("") || `<p class="note">購入希望はまだありません</p>`;
  }
  draw();
  return wrap;
}

// ---------- マイページ ----------
function renderMyPage() {
  const myHoldingsAll = state.holdings.filter((h) => h.holdingType === "PERSONAL" && h.ownerId === state.currentUser);
  const myLoansActive = state.loans.filter((l) => l.status === "ACTIVE" && l.borrowerId === state.currentUser);
  const receivedRelays = state.relayRequests.filter((r) => r.toUserId === state.currentUser && r.status === "ACCEPTED").length;
  const pendingRelays = state.relayRequests.filter((r) => r.toUserId === state.currentUser && r.status === "PENDING").length;
  const myBorrowRequests = state.borrowRequests.filter((r) => r.requesterId === state.currentUser && (r.status === "PENDING" || r.status === "APPROVED"));

  const wrap = el(`<div>
    <h2>マイページ - ${state.currentUser}</h2>
    <div class="row">
      <div class="stat-box"><div class="num">${myHoldingsAll.length}</div>登録した私物</div>
      <div class="stat-box"><div class="num">${myLoansActive.length}</div>現在借りている本</div>
      <div class="stat-box"><div class="num">${receivedRelays}</div>受け取ったリレー</div>
      <div class="stat-box"><div class="num">${pendingRelays}</div>受け取り待ちリレー</div>
    </div>

    <div class="card">
      <b>私物の公開範囲</b>
      <div id="myHoldingsList"></div>
    </div>

    <div class="card">
      <b>あなたの貸出依頼状況</b>
      <div>${myBorrowRequests.map((r) => { const h = holdingById(r.holdingId); const b = h ? bookById(h.bookId) : null; return `<div class="list-item">${b ? b.title : "?"} - ${r.status === "APPROVED" ? "承認済み・返却待ち" : "申請中"}</div>`; }).join("") || `<p class="note">依頼中の本はありません</p>`}</div>
    </div>
  </div>`);

  function drawHoldings() {
    const list = wrap.querySelector("#myHoldingsList");
    list.innerHTML = myHoldingsAll.map((h) => {
      const b = bookById(h.bookId);
      return `<div class="list-item">${b ? b.title : "?"}
        <select data-vis="${h.id}">
          <option value="PRIVATE" ${h.visibility === "PRIVATE" ? "selected" : ""}>非公開</option>
          <option value="INTERNAL_VISIBLE" ${h.visibility === "INTERNAL_VISIBLE" ? "selected" : ""}>社内表示のみ</option>
          <option value="LOAN_AVAILABLE" ${h.visibility === "LOAN_AVAILABLE" ? "selected" : ""}>社内表示＋貸出可</option>
        </select>
      </div>`;
    }).join("") || `<p class="note">登録した私物はありません</p>`;
    list.querySelectorAll("[data-vis]").forEach((sel) => sel.addEventListener("change", () => {
      const h = holdingById(sel.dataset.vis);
      h.visibility = sel.value;
      h.loanAllowed = sel.value === "LOAN_AVAILABLE";
      saveState(state); render();
    }));
  }
  drawHoldings();
  return wrap;
}

// ---------- 通知プレビュー(LINE連携は本セッション未実装、抽出ロジックのみ) ----------
function renderNotify() {
  const thresholdKey = "unreadDaysThreshold";
  const threshold = Number(localStorage.getItem(thresholdKey)) || 30;

  const neverLoaned = state.books.filter((b) => {
    const holdings = state.holdings.filter((h) => h.bookId === b.id);
    return holdings.length > 0 && !state.loans.some((l) => holdings.some((h) => h.id === l.holdingId));
  });
  const longUnread = state.books.filter((b) => {
    const holdings = state.holdings.filter((h) => h.bookId === b.id);
    const relevantLoans = state.loans.filter((l) => holdings.some((h) => h.id === l.holdingId) && l.status === "RETURNED");
    if (relevantLoans.length === 0) return false;
    const lastEnd = relevantLoans.map((l) => l.returnedAt).sort().slice(-1)[0];
    return daysBetween(lastEnd, todayStr()) >= threshold;
  });
  const recommended = state.books.map((b) => {
    const rs = state.reviews.filter((r) => r.bookId === b.id);
    const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
    return { book: b, avg, count: rs.length };
  }).filter((x) => x.count > 0).sort((a, b) => b.avg - a.avg).slice(0, 3);

  const wrap = el(`<div>
    <h2>通知プレビュー(Mock)</h2>
    <p class="note">本セッションではアプリ内Mock通知のみ。会社LINEアカウントとの実連携(リッチメニュー・実送信)は未実装(設計のみ、docs/requirements.md参照)。</p>
    <div class="card">
      <label>未読とみなす日数のしきい値</label>
      <input id="thresholdInput" type="number" value="${threshold}">
      <button class="btn" id="saveThreshold">保存</button>
    </div>
    <div class="card"><b>🔔 誰にも読まれていない本</b><div>${neverLoaned.map((b) => `<div class="list-item">${b.title}</div>`).join("") || `<p class="note">該当なし</p>`}</div></div>
    <div class="card"><b>🔔 長期間読まれていない本(${threshold}日以上)</b><div>${longUnread.map((b) => `<div class="list-item">${b.title}</div>`).join("") || `<p class="note">該当なし</p>`}</div></div>
    <div class="card"><b>🔔 おすすめの本(レビュー高評価)</b><div>${recommended.map((x) => `<div class="list-item">${x.book.title} (平均★${x.avg.toFixed(1)})</div>`).join("") || `<p class="note">レビューがまだありません</p>`}</div></div>
  </div>`);

  wrap.querySelector("#saveThreshold").addEventListener("click", () => {
    localStorage.setItem(thresholdKey, Number(wrap.querySelector("#thresholdInput").value) || 30);
    render();
  });
  return wrap;
}

// ---------- 操作マニュアル ----------
const MANUAL_SECTIONS = [
  { title: "アプリを起動する", body: "frontend/index.html をブラウザ(Chrome/Edge推奨)で直接開く。サーバー不要。LINEアプリ内(LIFF)で開いた場合は自分のLINEプロフィールがそのままログインユーザーになる。通常ブラウザで開いた場合(動作確認用)は、画面右上の「ログインユーザー」で操作する人を切り替えられる(山田/田中/佐藤/鈴木/高橋)。<br><b>注意:</b> データはブラウザのlocalStorageにのみ保存され、他の人・他端末とは共有されない。" },
  { title: "書籍を探す", body: "「本棚」タブの検索欄にタイトル・ISBNの一部を入力すると絞り込まれる。通常検索で0件の場合、登録済みの本の中からAIが意味的に近い候補を「✨ AIによる類似候補」として提示する。" },
  { title: "書籍を登録する", body: "「登録」タブ、または本棚下部の「＋ 新しい本を登録」から入力画面を開き、書籍名・著者・出版社・あらすじ・カテゴリ・ページ数・内容の特徴(チェックボックス)・所有区分(会社所有/私物)・保管場所を入力して保存する。" },
  { title: "ISBNで登録する", body: "登録画面のISBN欄に入力し「ISBN書誌情報取得(Mock)」を押すと、タイトル等が自動入力される。<b>本セッションでは実際の外部書誌APIへは接続せず、擬似データを生成している。</b>" },
  { title: "会社所有書籍を見る", body: "本棚の各本には「会社所有」または「私物」のラベルが表示される。書籍詳細の「所蔵(Holding)一覧」で会社所有・私物それぞれの状況を確認できる。" },
  { title: "私物を登録する", body: "登録画面で所有区分を「私物」に切り替えると、所有者・公開範囲の入力欄が表示される。所有者を選び保存すると私物として登録される。" },
  { title: "私物を共有する", body: "「マイページ」の「私物の公開範囲」で、登録済みの私物ごとに公開範囲(非公開/社内表示のみ/社内表示＋貸出可)を変更できる。" },
  { title: "私物共有を停止する", body: "「マイページ」で該当の私物の公開範囲を「非公開」に変更する。以後、他ユーザーの本棚・検索結果には表示されない。" },
  { title: "本を借りる", body: "書籍詳細で所蔵(Holding)を選択し、「在庫」状態であれば「この本を借りる」ボタンが表示される。押すと即時に貸出が成立する(貸出期間14日間)。" },
  { title: "次に借りたい依頼を出す", body: "所蔵が「貸出中」の場合、現所持者以外に「次に借りたい(貸出依頼)」フォームが表示される。メッセージを添えて送信すると現所持者に依頼が届く。" },
  { title: "貸出依頼を承認する", body: "「貸出・返却・貸出待ち」タブの「あなたへの貸出依頼」一覧から「承認」を押す。承認後、現所持者が返却したタイミングで自動的に依頼者へ貸し出される。" },
  { title: "貸出依頼を拒否する", body: "同じ一覧から「拒否」を押す。" },
  { title: "貸出依頼をキャンセルする", body: "「貸出・返却・貸出待ち」タブの「あなたが送った貸出依頼」から、申請中の依頼を「キャンセル」できる。" },
  { title: "貸出待ちを見る", body: "貸出中一覧の各本に「貸出待ち◯人」のラベルが表示される。書籍詳細でも申請順に確認できる。" },
  { title: "本を返却する", body: "「貸出・返却・貸出待ち」タブの「貸出中一覧」から、自分が借りている本の「返却」を押す。承認済みの貸出依頼があれば、返却と同時にその人へ自動的に貸し出される。" },
  { title: "リレーを送る", body: "「リレー(バトン読書)」タブで、自分が現在所持している本・次に読んでほしい人・メッセージを選び「リレーする」を押す。<b>その本に既に貸出待ちがある場合は、順番を守るためリレーできない。</b>" },
  { title: "リレーを受ける", body: "「あなた宛のリレー」一覧から「受け取る」を押す。受け取るとその本の現所持者が自分になる。" },
  { title: "リレーを断る", body: "同じ一覧から「辞退する」を押す。" },
  { title: "レビューを書く", body: "書籍詳細の「レビュー」欄で評価(1〜5)とコメントを入力し「レビュー投稿」を押す。レビューは書籍(Book)に紐付き、会社所有・私物を問わず同じ本であれば共有される。" },
  { title: "購入希望を登録する", body: "「購入希望」タブでタイトルと理由(任意)を入力し「希望を追加」を押す。同じタイトルの希望は希望者数として集計される。" },
  { title: "AI類似候補を見る", body: "「書籍を探す」を参照。通常検索で該当がない場合に自動的に表示される。" },
  { title: "サイズ・重量を見る", body: "書籍詳細に、登録済みのサイズ・重量と取得元(Mock取得/手入力)が表示される。登録画面の「商品情報取得(Mock)」で擬似データを自動入力できる。<b>本セッションでは実際のAmazon等の外部APIへは接続していない。</b>" },
  { title: "Physical Loadを見る", body: "書籍詳細に「💪 Physical Load」として0〜100のスコアが表示される(重量から算出、Mock)。医学的な指標ではなく参考値。" },
  { title: "Reading Loadを見る", body: "書籍詳細に「🧠 Reading Load」として0〜100のスコアが表示される(ページ数・内容の特徴から算出、Mock)。" },
  { title: "読書カレーを見る", body: "書籍詳細に「🍛 読書カレー」として辛さ(🌶の数)・カレー種類・トッピング・AIコメントが表示される。科学的評価ではなく、アプリ独自の遊び心のある指標。" },
  { title: "しおりを作る", body: "書籍詳細の「AIしおり自動生成」で「しおりを生成」を押すと、タイトル・あらすじをもとにしたオリジナル画像が生成される。<b>本セッションでは実際のAI画像生成APIへは接続せず、Canvas描画による簡易生成としている。</b>" },
  { title: "ロゴ文字を設定する", body: "しおり生成欄の「ロゴ文字」に会社名等の文字列を入力し、「ロゴ位置」(左上/右上/左下/右下)を選んでから生成する。<b>会社ロゴは画像ではなく、指定した文字列がしおり画像に合成される。</b>" },
  { title: "しおりを印刷する", body: "しおり生成後に「印刷」ボタンを押すと、別ウィンドウでしおり画像を開きブラウザの印刷機能を呼び出す。" },
  { title: "エラー時の対処", body: "書籍名やレビューコメントを空のまま登録・投稿しようとするとメッセージが表示され保存されない。貸出不可設定の私物には「貸出不可に設定されています」と表示される。外部サービスはすべてMockのため通信エラーは発生しない。" },
];

function renderManual() {
  const wrap = el(`<div>
    <h2>操作マニュアル</h2>
    <p class="note">実装済みの機能のみを記載しています。詳細版は docs/user-manual.md も参照してください。</p>
    <div id="manualList"></div>
  </div>`);
  wrap.querySelector("#manualList").innerHTML = MANUAL_SECTIONS.map((s) => `
    <div class="card"><h3>${s.title}</h3><p>${s.body}</p></div>
  `).join("");
  return wrap;
}

// ---------- 社内発表用：技術・将来構成・工夫点 ----------
function renderPresentation() {
  return el(`<div>
    <h2>このアプリの技術・将来構成・工夫点</h2>
    <p class="presentation-lead">会社の本と社員が任意共有する本を、人から人へつなぐ社内書籍ポータルです。現在はAWS認証情報なしで動くローカルMockとして実装しています。</p>

    <div class="presentation-grid">
      <section class="card">
        <h3>現在の使用技術</h3>
        <ul>
          <li>HTML / CSS / JavaScriptによるフロントエンド</li>
          <li>localStorageによるMockデータ保存</li>
          <li>Canvas APIによるしおり画像生成Mock</li>
          <li>ルールベースのAI類似検索・Reading Load・読書カレー</li>
          <li>外部API・AWS認証情報なしでローカル起動</li>
        </ul>
      </section>

      <section class="card">
        <h3>将来のAWS構成</h3>
        <ul>
          <li>React / TypeScript / Vite</li>
          <li>AWS Amplify Hosting</li>
          <li>API Gateway + Lambda</li>
          <li>DynamoDB / Cognito / S3</li>
          <li>Amazon Bedrockによる検索・分析・画像生成</li>
          <li>EventBridge / SES / SNSによる通知拡張</li>
        </ul>
      </section>

      <section class="card">
        <h3>主な工夫点</h3>
        <ul>
          <li>BookとHoldingを分け、同じ本と物理的な一冊を別管理</li>
          <li>会社所有と私物を区別し、私物共有は本人のOpt-in方式</li>
          <li>「次に借りたい」Pull型と「リレー」Push型を両立</li>
          <li>貸出待ち順を優先する設計</li>
          <li>本棚UIとサイズ比例表示</li>
          <li>Reading Loadや読書カレーで本の特徴を楽しく可視化</li>
          <li>AI背景と正確な会社名文字を分けて合成するしおり設計</li>
        </ul>
      </section>
    </div>

    <section class="card" style="margin-top:16px;">
      <h3>MockからAWSへ</h3>
      <div class="architecture-flow">
        <span>ブラウザMock</span><i>→</i><span>React + Amplify</span><i>→</i><span>API Gateway + Lambda</span><i>→</i><span>DynamoDB / Bedrock / S3</span>
      </div>
      <p class="note" style="margin-top:16px;">現在のAWS構成は設計のみです。今回のワークショップでは実際のAWS構築・デプロイは行っていません。</p>
    </section>
  </div>`);
}

initLineLogin().finally(() => {
  renderUserSwitch();
  render();
});
