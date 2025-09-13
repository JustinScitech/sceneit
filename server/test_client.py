import os
import sys
import time
from pathlib import Path

import requests


def pick_sample_image(root: Path) -> Path:
    # 1) Env override
    env = os.environ.get("TEST_IMAGE")
    if env:
        p = Path(env).expanduser()
        if p.exists():
            return p

    # 2) Common TripoSR examples
    candidates = [
        root / "TripoSR" / "examples" / "chair.png",
        root / "TripoSR" / "examples" / "hamburger.png",
        root / "TripoSR" / "examples" / "flamingo.png",
    ]
    # 3) Top-level test images
    candidates += [
        root / "test1.jpeg",
        root / "test2.jpeg",
        root / "test3.jpeg",
        root / "test4.jpeg",
    ]

    for c in candidates:
        if c.exists():
            return c

    # 4) Last resort: any png/jpg/jpeg under repo
    exts = ["*.png", "*.jpg", "*.jpeg"]
    for ext in exts:
        found = list(root.rglob(ext))
        if found:
            return found[0]

    raise FileNotFoundError("No sample image found. Set TEST_IMAGE env var to a valid path.")


def guess_mime(path: Path) -> str:
    s = path.suffix.lower()
    if s == ".png":
        return "image/png"
    if s in (".jpg", ".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    sample_image = pick_sample_image(root)

    url = os.environ.get("SERVER_URL", "http://127.0.0.1:8000/convert")
    compress = os.environ.get("COMPRESS", "true").lower() == "true"
    compression = os.environ.get("COMPRESSION", "gzip")

    mime = guess_mime(sample_image)
    with open(sample_image, "rb") as f:
        files = {"file": (sample_image.name, f, mime)}
        params = {"compress": str(compress).lower(), "compression": compression}
        print(f"POST {url} with {sample_image.name}, compress={compress}, compression={compression}")
        t0 = time.time()
        r = requests.post(url, files=files, params=params, stream=True, timeout=1800)
        r.raise_for_status()
        out_name = "mesh.obj.gz" if compress and compression == "gzip" else (
            "mesh.zip" if compress and compression == "zip" else "mesh.obj"
        )
        out_path = root / "server" / out_name
        with open(out_path, "wb") as out:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    out.write(chunk)
        dt = time.time() - t0
        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"✅ Downloaded {out_name} -> {size_mb:.2f} MB in {dt:.1f}s")
        print(f"📁 Saved to: {out_path.absolute()}")
        
        # If compressed, extract it for inspection
        if compress and compression == "gzip":
            import gzip
            obj_path = root / "server" / "mesh.obj"
            with gzip.open(out_path, 'rb') as gz_file:
                with open(obj_path, 'wb') as obj_file:
                    obj_file.write(gz_file.read())
            print(f"📁 Extracted OBJ to: {obj_path.absolute()}")
        elif compress and compression == "zip":
            import zipfile
            obj_path = root / "server" / "mesh.obj"
            with zipfile.ZipFile(out_path, 'r') as zip_file:
                zip_file.extract('mesh.obj', root / "server")
            print(f"📁 Extracted OBJ to: {obj_path.absolute()}")


if __name__ == "__main__":
    main()


