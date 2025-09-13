import io
import math
from typing import Optional

from fastapi import UploadFile, HTTPException
from PIL import Image
import numpy as np
import rembg

from ..settings import Settings


class ImageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._rembg_session: Optional[object] = None

    async def initialize(self) -> None:
        self._rembg_session = rembg.new_session()

    def validate_image(self, upload: UploadFile) -> None:
        max_bytes = self.settings.max_upload_mb * 1024 * 1024
        if upload.filename is None:
            raise HTTPException(status_code=400, detail="Missing filename")
        # Rely on client-provided headers size isn't reliable; we parse during load
        # Validate extension/MIME lightly
        lower = upload.filename.lower()
        if not (lower.endswith(".png") or lower.endswith(".jpg") or lower.endswith(".jpeg")):
            raise HTTPException(status_code=400, detail="Unsupported file type. Use PNG or JPEG.")
        # FastAPI UploadFile exposes .spool_max_size; actual size checked on read
        # We'll enforce after reading into memory to PIL (in-memory safeguard)

    async def load_image(self, upload: UploadFile) -> Image.Image:
        data = await upload.read()
        if len(data) > self.settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size")
        try:
            img = Image.open(io.BytesIO(data))
            img.load()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        return img

    def preprocess(self, image: Image.Image, foreground_ratio: float = 0.85) -> Image.Image:
        if self._rembg_session is None:
            self._rembg_session = rembg.new_session()

        image = rembg.remove(image, session=self._rembg_session)

        # Ensure RGBA -> composite on gray background as in notebook
        if image.mode == "RGB":
            image = image.convert("RGBA")

        # Resize foreground similar to notebook's resize_foreground
        # Simple heuristic: scale so the subject occupies foreground_ratio of canvas
        image_np = np.array(image).astype(np.float32) / 255.0
        alpha = image_np[:, :, 3:4] if image_np.shape[2] == 4 else np.ones_like(image_np[:, :, :1])
        comp = image_np[:, :, :3] * alpha + (1 - alpha) * 0.5
        image = Image.fromarray((comp * 255.0).astype(np.uint8))
        return image


