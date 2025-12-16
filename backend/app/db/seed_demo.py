
import asyncio
import uuid
import random
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models import (
    User, Student, Teacher, StudentTeacher, ResearchTheme, 
    Report, ReportAbility, Ability, ResearchPhase, ThemeStatus, UserRole
)
from app.services.auth import get_password_hash

# Constants
TEACHER_EMAIL = "teacher@test.com"
STUDENT_EMAIL = "student@test.com"
PASSWORD = "password123"

SAMPLE_REPORT_CONTENTS = [
    "今日は文献調査を行った。特に「マインドセット」に関する章を読み、成長思考の重要性を学んだ。",
    "アンケートの質問項目を作成した。想定される回答をシミュレーションしながら記述を調整した。",
    "インタビューの依頼メールを送った。失礼のないように敬語の使い方を先生に確認してもらった。",
    "集めたデータをエクセルに入力した。意外と時間がかかったが、傾向が見えてきて面白かった。",
    "中間発表のポスターを作成した。文字を減らして図解を増やす工夫をした。",
    "先行研究の論文を読んだが、専門用語が多くて難しかった。次回は用語集を作りながら読みたい。",
    "チームで議論を行い、研究の方向性を修正することにした。対話の重要性を感じた。",
    "フィールドワークで商店街を訪れた。実際に足を運ぶことでしか分からない雰囲気を感じ取れた。",
    "先生からフィードバックをもらい、仮説の論理的な弱点に気づくことができた。",
    "今日は集中して執筆活動ができた。結論部分の構成が固まったので、あとは書き進めるだけだ。"
]

async def get_or_create_user(session, email, name, role):
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        print(f"Creating user: {email}")
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            role=role,
            is_active=True,
            password_hash=get_password_hash(PASSWORD),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(user)
        await session.flush()
    else:
        print(f"User exists: {email}")
        # Build user password to ensure it matches
        user.password_hash = get_password_hash(PASSWORD)
        user.is_active = True
        session.add(user)
        await session.flush()
        
    return user

async def seed_demo_data():
    print("Starting demo data seed...")
    
    async with AsyncSessionLocal() as session:
        # 1. Master Data check
        # Fetch Abilities
        result = await session.execute(select(Ability))
        abilities = result.scalars().all()
        if not abilities:
            print("No abilities found! Please run 'python -m app.db.seed' first.")
            return

        # Fetch Phases
        result = await session.execute(select(ResearchPhase))
        phases = result.scalars().all()
        
        # 2. Create Users
        teacher_user = await get_or_create_user(session, TEACHER_EMAIL, "先生 太郎", UserRole.TEACHER)
        student_user = await get_or_create_user(session, STUDENT_EMAIL, "生徒 花子", UserRole.STUDENT)
        
        # 3. Create Profiles
        # Teacher Profile
        result = await session.execute(select(Teacher).where(Teacher.user_id == teacher_user.id))
        teacher_profile = result.scalar_one_or_none()
        if not teacher_profile:
            teacher_profile = Teacher(
                id=str(uuid.uuid4()),
                user_id=teacher_user.id,
                department="進路指導部",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(teacher_profile)
            await session.flush()

        # Student Profile
        result = await session.execute(select(Student).where(Student.user_id == student_user.id))
        student_profile = result.scalar_one_or_none()
        if not student_profile:
            student_profile = Student(
                id=str(uuid.uuid4()),
                user_id=student_user.id,
                grade=2,
                class_name="A",
                student_number="15",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(student_profile)
            await session.flush()
            
        # 4. Link Student and Teacher
        result = await session.execute(
            select(StudentTeacher).where(
                StudentTeacher.student_id == student_profile.id,
                StudentTeacher.teacher_id == teacher_profile.id
            )
        )
        link = result.scalar_one_or_none()
        if not link:
            link = StudentTeacher(
                id=str(uuid.uuid4()),
                student_id=student_profile.id,
                teacher_id=teacher_profile.id,
                is_primary=True,
                fiscal_year=2024, # Current fiscal year
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(link)

        # 5. Create Research Theme
        result = await session.execute(
            select(ResearchTheme).where(
                ResearchTheme.student_id == student_profile.id,
                ResearchTheme.fiscal_year == 2024
            )
        )
        theme = result.scalar_one_or_none()
        if not theme:
            print("Creating research theme...")
            theme = ResearchTheme(
                id=str(uuid.uuid4()),
                student_id=student_profile.id,
                title="地域社会における商店街の活性化に関する研究",
                description="シャッター通り化が進む地元の商店街を対象に、若者を呼び込むための施策を提案する。",
                fiscal_year=2024,
                status=ThemeStatus.IN_PROGRESS,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(theme)
            await session.flush()

        # 6. Create Reports (if few exist)
        # Check existing report count
        result = await session.execute(select(Report).where(Report.student_id == student_profile.id))
        existing_reports = result.scalars().all()
        
        reports_to_create = 15 - len(existing_reports)
        if reports_to_create > 0:
            print(f"Creating {reports_to_create} sample reports...")
            
            for i in range(reports_to_create):
                # Random date in last 30 days
                days_ago = random.randint(0, 30)
                report_date = datetime.utcnow() - timedelta(days=days_ago)
                
                phase = random.choice(phases) if phases else None
                content = random.choice(SAMPLE_REPORT_CONTENTS)
                
                report = Report(
                    id=str(uuid.uuid4()),
                    student_id=student_profile.id,
                    theme_id=theme.id,
                    phase_id=phase.id if phase else None,
                    content=content,
                    reported_at=report_date,
                    ai_comment="素晴らしい着眼点ですね！次は具体的なアクションプランに落とし込んでみましょう。",
                    created_at=report_date,
                    updated_at=report_date
                )
                session.add(report)
                await session.flush()
                
                # Link Abilities (Always 3: strong 1 + sub 2) with points
                selected_abilities = random.sample(abilities, k=min(3, len(abilities)))
                if len(selected_abilities) < 3:
                    # Fill deterministically if fewer than 3 abilities exist
                    selected_abilities = (selected_abilities + abilities)[:3]

                for idx, ability in enumerate(selected_abilities[:3]):
                    ra = ReportAbility(
                        id=str(uuid.uuid4()),
                        report_id=report.id,
                        ability_id=ability.id,
                        role="strong" if idx == 0 else "sub",
                        points=2 if idx == 0 else 1,
                        created_at=report_date,
                        updated_at=report_date
                    )
                    session.add(ra)
                    
        await session.commit()
        print("Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
