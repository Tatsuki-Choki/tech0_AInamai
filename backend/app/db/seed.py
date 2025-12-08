"""
Seed script for initial master data.
Run with: python -m app.db.seed
"""
import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models import Ability, ResearchPhase


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


async def run_seed():
    """Run all seed functions."""
    print("Starting seed...")

    async with AsyncSessionLocal() as session:
        await seed_abilities(session)
        await seed_research_phases(session)

    print("Seed completed!")


if __name__ == "__main__":
    asyncio.run(run_seed())
