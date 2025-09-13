import os
from dataclasses import dataclass


@dataclass
class Settings:
    tsr_model_repo: str = os.getenv("TSR_MODEL_REPO", "stabilityai/TripoSR")
    tsr_config_name: str = os.getenv("TSR_CONFIG_NAME", "config.yaml")
    tsr_weight_name: str = os.getenv("TSR_WEIGHT_NAME", "model.ckpt")

    device: str = os.getenv("DEVICE", "cuda:0")
    render_chunk_size: int = int(os.getenv("RENDER_CHUNK_SIZE", "8192"))

    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "50"))
    tmp_dir: str = os.getenv("TMP_DIR", os.path.join(os.path.dirname(__file__), "tmp"))

    enable_compression: bool = os.getenv("ENABLE_COMPRESSION", "true").lower() == "true"
    compression_type: str = os.getenv("COMPRESSION_TYPE", "gzip")  # gzip | zip

    concurrent_jobs: int = int(os.getenv("CONCURRENT_JOBS", "1"))
    request_timeout_seconds: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "600"))


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        os.makedirs(Settings().tmp_dir, exist_ok=True)
        _settings = Settings()
    return _settings


