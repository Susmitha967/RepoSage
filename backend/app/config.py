from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    github_client_id: str
    github_client_secret: str
    github_token: str
    groq_api_key: str
    database_url: str
    redis_url: str

    class Config:
        env_file = ".env"

settings = Settings()