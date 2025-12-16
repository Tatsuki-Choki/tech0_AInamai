import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings


def get_database_url_and_ssl():
    """Parse database URL and extract SSL settings for aiomysql."""
    url = settings.DATABASE_URL

    # Handle empty or invalid URL
    if not url:
        print("Warning: DATABASE_URL is not set")
        return "mysql+aiomysql://localhost/test", None
    
    if url.startswith("sqlite"):
        return url, None

    parsed = urlparse(url)

    # Check if ssl=true is in query params
    query_params = parse_qs(parsed.query)
    use_ssl = query_params.pop('ssl', ['false'])[0].lower() == 'true'

    # Rebuild URL without ssl parameter
    new_query = urlencode(query_params, doseq=True)
    clean_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))

    # Create SSL context for Azure MySQL
    ssl_context = None
    if use_ssl:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    return clean_url, ssl_context


try:
    database_url, ssl_context = get_database_url_and_ssl()
    print(f"Database URL configured (SSL: {ssl_context is not None})")
except Exception as e:
    print(f"Error parsing database URL: {e}")
    database_url = "sqlite+aiosqlite:///./test.db"
    ssl_context = None

connect_args = {}
if "mysql" in database_url:
    connect_args["charset"] = "utf8mb4"
    if ssl_context:
        connect_args["ssl"] = ssl_context

engine = create_async_engine(
    database_url,
    echo=settings.DATABASE_ECHO,
    future=True,
    connect_args=connect_args,
    pool_pre_ping=True,  # Verify connections before using
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
