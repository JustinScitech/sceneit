import asyncio


_inference_semaphore: asyncio.Semaphore | None = None


def init_inference_semaphore(max_concurrent: int) -> None:
    global _inference_semaphore
    _inference_semaphore = asyncio.Semaphore(max_concurrent)


def get_inference_semaphore() -> asyncio.Semaphore:
    if _inference_semaphore is None:
        raise RuntimeError("Inference semaphore not initialized")
    return _inference_semaphore


