from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MiqorAI Clinical Safety Service"
    host: str = "0.0.0.0"
    port: int = 8000

    base_model_id: str = "Qwen/Qwen1.5-0.5B-Chat"
    adapter_path: str = "model/miqorai-qwen1.5-0.5b-lora-json-v3"
    use_4bit: bool = True
    trust_remote_code: bool = True

    max_new_tokens: int = 160
    repetition_penalty: float = 1.2
    no_repeat_ngram_size: int = 4

    debug_raw_model_output: bool = False
    cors_origins: str = "*"

    @field_validator("base_model_id", "adapter_path", "cors_origins", mode="before")
    @classmethod
    def strip_inline_env_assignment(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        cleaned = value.strip()
        for prefix in ("BASE_MODEL_ID=", "ADAPTER_PATH=", "CORS_ORIGINS="):
            if cleaned.startswith(prefix):
                return cleaned[len(prefix) :].strip()
        return cleaned

    @property
    def adapter_dir(self) -> Path:
        return Path(self.adapter_path)


settings = Settings()
