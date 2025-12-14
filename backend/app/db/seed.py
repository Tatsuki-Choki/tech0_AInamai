from datetime import datetime
import asyncio
import uuid
import sys
from pathlib import Path

# Add parent directory to path to allow importing app
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models import Ability, ResearchPhase, Book


# 7つの能力マスタデータ
ABILITIES_DATA = [
    {
        "name": "情報収集能力と先を見る力",
        "description": "トレンドを感知し、未来を予測する力",
        "display_order": 1,
    },
    {
        "name": "課題設定能力と構想する力",
        "description": "課題を設定し、構想を練る力",
        "display_order": 2,
    },
    {
        "name": "巻き込む力",
        "description": "他人を巻き込み、協力を得る力",
        "display_order": 3,
    },
    {
        "name": "対話する力",
        "description": "対話を通じて相手を理解する力",
        "display_order": 4,
    },
    {
        "name": "実行する力",
        "description": "小さなことから始め、実行に移す力",
        "display_order": 5,
    },
    {
        "name": "謙虚である力",
        "description": "謙虚な姿勢で仲間を集める力",
        "display_order": 6,
    },
    {
        "name": "完遂する力",
        "description": "諦めずにやり遂げる力",
        "display_order": 7,
    },
]

# 4つの探究フェーズマスタデータ
RESEARCH_PHASES_DATA = [
    {"name": "課題の設定", "display_order": 1},
    {"name": "情報の収集", "display_order": 2},
    {"name": "整理・分析", "display_order": 3},
    {"name": "まとめ・表現", "display_order": 4},
]


# 推薦図書マスタデータ（MVP用）
BOOKS_DATA = [
    {
        "title": "マインドセット やればできる！の研究",
        "author": "キャロル・S・ドゥエック",
        "description": "この本は、人の能力は生まれつき決まっているものではなく、考え方次第で伸ばせるという「成長マインドセット」を科学的に解説しています。失敗を「才能がない証拠」と捉えるか、「成長の途中」と捉えるかで、その後の人生は大きく変わることが示されます。",
        "cover_image_url": "/static/books/マインドセット.png",
        "recommended_comment": "高校生におすすめなのは、テストの点数や部活の結果で自分の価値を決めなくてよくなるからです。努力の意味を正しく理解でき、自分を諦めなくて済む思考の土台を作ってくれる一冊です。",
    },
    {
        "title": "チェンジ・モンスター",
        "author": "ジーニー・ダニエル・ダック",
        "description": "人は変わったほうがいいと頭では分かっていても、なぜか変化を拒んでしまう。その正体を「チェンジ・モンスター」という概念で解き明かす本です。変化を妨げるのは怠けではなく、人間の本能的な反応だと説明されます。",
        "cover_image_url": "/static/books/チェンジモンスター.png",
        "recommended_comment": "高校生にとって重要なのは、「変われない自分」を責めなくてよくなる点です。進路選択や挑戦が怖くなる理由を構造的に理解でき、自分をコントロールする視点が手に入ります。",
    },
    {
        "title": "LIFE SHIFT 100年時代の人生戦略",
        "author": "リンダ・グラットン / アンドリュー・スコット",
        "description": "人生100年時代では、学校を出て就職し定年まで働くという一本道の人生は通用しないと説く本です。学び直し、複数のキャリア、長期視点での人生設計が必要だと示されます。",
        "cover_image_url": "/static/books/ライフシフト.png",
        "recommended_comment": "高校生におすすめなのは、「今決めた進路が一生を縛るわけではない」と知れるからです。将来への不安が減り、人生を長いゲームとして捉える視点が育ちます。選択を柔軟に考える力が身につきます。",
    },
    {
        "title": "ポートフォリオワーカー",
        "author": "マダム・ホー",
        "description": "一つの会社や仕事に依存せず、複数のスキルや収入源を組み合わせて生きる「ポートフォリオワーク」という働き方を紹介する本です。好きなことや得意なことを掛け合わせて価値を作る考え方が描かれています。",
        "cover_image_url": "/static/books/ポートフォリオワーカー.png",
        "recommended_comment": "高校生におすすめなのは、「やりたいことが一つに決まらなくていい」と分かるからです。将来の仕事を点ではなく線や面で考えられるようになり、自分らしい働き方の発想が広がります。",
    },
    {
        "title": "ミドルからの変革",
        "author": "長谷川博和 / 池上重輔 / 大場幸子",
        "description": "本来は社会人向けの本ですが、「組織や社会はどう変わるのか」を知る入門書として非常に有効です。変革は一部の天才が起こすものではなく、現場の小さな行動の積み重ねから生まれると語られます。",
        "cover_image_url": "/static/books/ミドルからの変革.png",
        "recommended_comment": "高校生におすすめなのは、社会を「決まったルールの世界」ではなく「自分たちで更新できるもの」として捉えられるようになる点です。主体的に社会を見る視点が育ちます。",
    },
]


async def seed_abilities(session):
    """Seed abilities master data."""
    result = await session.execute(select(Ability))
    existing = result.scalars().all()

    if existing:
        print(f"Abilities already exist ({len(existing)} records). Skipping...")
        return

    for data in ABILITIES_DATA:
        ability = Ability(
            id=uuid.uuid4(),
            name=data["name"],
            description=data["description"],
            display_order=data["display_order"],
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(ability)

    await session.commit()
    print(f"Created {len(ABILITIES_DATA)} abilities.")


async def seed_research_phases(session):
    """Seed research phases master data."""
    result = await session.execute(select(ResearchPhase))
    existing = result.scalars().all()

    if existing:
        print(f"Research phases already exist ({len(existing)} records). Skipping...")
        return

    for data in RESEARCH_PHASES_DATA:
        phase = ResearchPhase(
            id=uuid.uuid4(),
            name=data["name"],
            display_order=data["display_order"],
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(phase)

    await session.commit()
    print(f"Created {len(RESEARCH_PHASES_DATA)} research phases.")


async def seed_books(session):
    """Seed books master data."""
    # Check if books with same titles already exist to avoid duplicates
    existing_books = await session.execute(select(Book))
    existing_titles = {b.title for b in existing_books.scalars().all()}

    count = 0
    for data in BOOKS_DATA:
        if data["title"] in existing_titles:
            continue
            
        book = Book(
            id=uuid.uuid4(),
            title=data["title"],
            author=data["author"],
            description=data["description"],
            cover_image_url=data["cover_image_url"],
            recommended_comment=data["recommended_comment"],
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(book)
        count += 1

    await session.commit()
    print(f"Created {count} books.")


async def run_seed():
    """Run all seed functions."""
    print("Starting seed...")

    async with AsyncSessionLocal() as session:
        await seed_abilities(session)
        await seed_research_phases(session)
        await seed_books(session)

    print("Seed completed!")


if __name__ == "__main__":
    asyncio.run(run_seed())
