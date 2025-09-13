from typing import Iterator


def iter_file(path: str, chunk_size: int = 8192) -> Iterator[bytes]:
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk


