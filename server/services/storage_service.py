import os
import shutil
from typing import Optional


def make_tmp_dir(base_dir: str, job_id: str) -> str:
    path = os.path.join(base_dir, job_id)
    os.makedirs(path, exist_ok=True)
    return path


def cleanup(path: Optional[str]) -> None:
    if not path:
        return
    try:
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)
        elif os.path.exists(path):
            os.remove(path)
    except Exception:
        # Best-effort cleanup
        pass


