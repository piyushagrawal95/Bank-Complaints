from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Complaints AI"
    frontend_origin: str = "http://localhost:5173"
    database_url: str = ""
    llm_provider: str = "groq"
    llm_model: str = ""
    groq_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()