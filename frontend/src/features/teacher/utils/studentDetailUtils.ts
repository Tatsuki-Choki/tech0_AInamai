// Types
export interface Book {
  id?: string;
  title: string;
  author?: string | null;
  publisher?: string | null;
  description?: string | null;
  isbn?: string | null;
  cover_image_url?: string | null;
  recommended_comment?: string | null;
}

export interface AbilityCount {
  ability_id: string;
  ability_name: string;
  count: number;
}

// Fallback books data
export const FALLBACK_BOOKS: Book[] = [
  {
    title: 'マインドセット やればできる！の研究',
    author: 'キャロル・S・ドゥエック',
    description:
      'この本は、人の能力は生まれつき決まっているものではなく、考え方次第で伸ばせるという「成長マインドセット」を科学的に解説しています。失敗を「才能がない証拠」と捉えるか、「成長の途中」と捉えるかで、その後の人生は大きく変わることが示されます。',
    cover_image_url: '/static/books/マインドセット.png',
    recommended_comment:
      '高校生におすすめなのは、テストの点数や部活の結果で自分の価値を決めなくてよくなるからです。努力の意味を正しく理解でき、自分を諦めなくて済む思考の土台を作ってくれる一冊です。',
  },
  {
    title: 'チェンジ・モンスター',
    author: 'ジーニー・ダニエル・ダック',
    description:
      '人は変わったほうがいいと頭では分かっていても、なぜか変化を拒んでしまう。その正体を「チェンジ・モンスター」という概念で解き明かす本です。変化を妨げるのは怠けではなく、人間の本能的な反応だと説明されます。',
    cover_image_url: '/static/books/チェンジモンスター.png',
    recommended_comment:
      '高校生にとって重要なのは、「変われない自分」を責めなくてよくなる点です。進路選択や挑戦が怖くなる理由を構造的に理解でき、自分をコントロールする視点が手に入ります。',
  },
  {
    title: 'LIFE SHIFT 100年時代の人生戦略',
    author: 'リンダ・グラットン / アンドリュー・スコット',
    description:
      '人生100年時代では、学校を出て就職し定年まで働くという一本道の人生は通用しないと説く本です。学び直し、複数のキャリア、長期視点での人生設計が必要だと示されます。',
    cover_image_url: '/static/books/ライフシフト.png',
    recommended_comment:
      '高校生におすすめなのは、「今決めた進路が一生を縛るわけではない」と知れるからです。将来への不安が減り、人生を長いゲームとして捉える視点が育ちます。選択を柔軟に考える力が身につきます。',
  },
  {
    title: 'ポートフォリオワーカー',
    author: 'マダム・ホー',
    description:
      '一つの会社や仕事に依存せず、複数のスキルや収入源を組み合わせて生きる「ポートフォリオワーク」という働き方を紹介する本です。好きなことや得意なことを掛け合わせて価値を作る考え方が描かれています。',
    cover_image_url: '/static/books/ポートフォリオワーカー.png',
    recommended_comment:
      '高校生におすすめなのは、「やりたいことが一つに決まらなくていい」と分かるからです。将来の仕事を点ではなく線や面で考えられるようになり、自分らしい働き方の発想が広がります。',
  },
  {
    title: 'ミドルからの変革',
    author: '長谷川博和 / 池上重輔 / 大場幸子',
    description:
      '本来は社会人向けの本ですが、「組織や社会はどう変わるのか」を知る入門書として非常に有効です。変革は一部の天才が起こすものではなく、現場の小さな行動の積み重ねから生まれると語られます。',
    cover_image_url: '/static/books/ミドルからの変革.png',
    recommended_comment:
      '高校生におすすめなのは、社会を「決まったルールの世界」ではなく「自分たちで更新できるもの」として捉えられるようになる点です。主体的に社会を見る視点が育ちます。',
  },
];

// Utility functions
export function getApiOriginForStatic(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

export function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickRecommendedBooks(params: {
  books: Book[];
  abilityCounts: AbilityCount[];
  studentIdSeed?: string;
  limit?: number;
}): Book[] {
  const { books, abilityCounts, studentIdSeed, limit = 3 } = params;
  if (!books || books.length === 0) return [];

  const titleIndex = new Map(books.map((b) => [b.title, b]));
  const byAbilityMatchers: Array<{ match: (name: string) => boolean; titles: string[] }> = [
    { match: (n) => n.includes('情報収集') || n.includes('先を見る'), titles: ['LIFE SHIFT 100年時代の人生戦略'] },
    { match: (n) => n.includes('課題設定') || n.includes('構想'), titles: ['チェンジ・モンスター'] },
    { match: (n) => n.includes('巻き込む'), titles: ['ミドルからの変革'] },
    { match: (n) => n.includes('対話'), titles: ['ミドルからの変革', 'チェンジ・モンスター'] },
    { match: (n) => n.includes('実行'), titles: ['チェンジ・モンスター', 'マインドセット やればできる！の研究'] },
    { match: (n) => n.includes('謙虚'), titles: ['マインドセット やればできる！の研究'] },
    { match: (n) => n.includes('完遂'), titles: ['マインドセット やればできる！の研究'] },
  ];

  const chosen: Book[] = [];
  const chosenTitles = new Set<string>();

  const sortedAbilities = [...abilityCounts].sort((a, b) => a.count - b.count);
  for (const ac of sortedAbilities) {
    if (chosen.length >= limit) break;
    const matcher = byAbilityMatchers.find((m) => m.match(ac.ability_name));
    if (!matcher) continue;
    for (const t of matcher.titles) {
      const book = titleIndex.get(t);
      if (!book) continue;
      if (chosenTitles.has(book.title)) continue;
      chosen.push(book);
      chosenTitles.add(book.title);
      break;
    }
  }

  if (chosen.length < limit) {
    const seed = studentIdSeed || 'default';
    const offset = hashStringToInt(seed) % books.length;
    const rotated = [...books.slice(offset), ...books.slice(0, offset)];
    for (const b of rotated) {
      if (chosen.length >= limit) break;
      if (chosenTitles.has(b.title)) continue;
      chosen.push(b);
      chosenTitles.add(b.title);
    }
  }

  return chosen.slice(0, limit);
}

export function getBookShortReason(title: string): string {
  const reasons: Record<string, string> = {
    'マインドセット やればできる！の研究': '失敗を成長に変える思考で挑戦を後押しします',
    'チェンジ・モンスター': '変化への抵抗を理解し行動に移す力を育てます',
    'LIFE SHIFT 100年時代の人生戦略': '長期視点で進路を捉え、不安を整理できます',
    'ポートフォリオワーカー': '得意を掛け合わせ、自分らしい選択肢を広げます',
    'ミドルからの変革': '周囲を巻き込み、小さな行動で変革を起こす視点',
  };
  return reasons[title] || '指導の観点を広げ、生徒の次の一歩を支えます';
}

function getAbilityKey(name: string): string {
  const n = name || '';
  if (n.includes('情報収集') || n.includes('先を見る')) return 'info';
  if (n.includes('課題設定') || n.includes('構想')) return 'plan';
  if (n.includes('巻き込む')) return 'involve';
  if (n.includes('対話')) return 'dialog';
  if (n.includes('実行')) return 'execute';
  if (n.includes('謙虚')) return 'humble';
  if (n.includes('完遂')) return 'finish';
  return 'other';
}

export function buildAiSummary(params: {
  studentName: string;
  themeTitle?: string | null;
  topAbility?: string;
  weakAbility?: string;
  totalReports: number;
}): string {
  const { studentName, themeTitle, topAbility, weakAbility, totalReports } = params;
  if (totalReports <= 0 || !topAbility) {
    return `${studentName}さんはこれから伸びしろが大きい段階です。まずは小さな気づきでもよいので、写真と一緒に「やったこと・分かったこと・次にすること」を継続して記録していきましょう。`;
  }
  const themePart = themeTitle ? `「${themeTitle}」` : '探究テーマ';
  const weakPart = weakAbility
    ? `次は${weakAbility}を意識した一手（問いを深める/検証する等）を入れると、学びの質が上がります。`
    : '次の報告では「問い→行動→振り返り」の流れを意識すると、学びが深まります。';
  return `${topAbility}が優れています。${themePart}に対してゴールのイメージを持ちながら、調べ方や進め方を組み立てて取り組めています。${weakPart}`;
}

export function buildGuidanceHint(params: { weakAbility?: string; totalReports: number }): string {
  const { weakAbility, totalReports } = params;
  if (totalReports <= 0) {
    return 'まずは「なぜそう思った？」「どこでそれが分かった？」を一言添えるだけでOKです。報告の質が上がり、次の指導ポイントも見えやすくなります。';
  }

  const key = weakAbility ? getAbilityKey(weakAbility) : 'other';
  const hints: Record<string, string> = {
    info: '情報収集では、信頼できる情報源（一次情報/公的データ）を一緒に確認しましょう。「なぜその情報源を選んだか」を振り返らせると力が伸びます。',
    plan: '課題設定は「誰の、どんな困りごとを、どう変えたいか」を明確にすると進みます。仮説と検証方法をセットで書かせる指導が効果的です。',
    involve:
      '巻き込む力は、協力者のメリットを言語化すると伸びます。声をかける相手と依頼内容を具体化し、短い期限で小さく頼む練習を入れましょう。',
    dialog:
      '対話は「質問→相手の言葉→自分の解釈」を分けて記録させると深まります。インタビュー前に質問を3つ作る時間を取るのも有効です。',
    execute:
      '実行は「今日やる最小タスク」を決めると進みます。やることを小さく分解し、完了条件を明確にして報告に残させましょう。',
    humble:
      '謙虚さは、失敗や想定外を「学び」に変える視点で育ちます。うまくいかなかった理由と次の改善案を1セットで書かせるのが効果的です。',
    finish:
      '完遂は、締切とアウトプット形式（ポスター/スライド等）を先に決めると強いです。週次で「進捗率」を見える化して伴走しましょう。',
    other:
      '報告内容から「根拠（何を見た/聞いた/試したか）」を必ず1つ入れるよう促しましょう。次の一手が具体的になり、指導もしやすくなります。',
  };
  return hints[key] || hints.other;
}
