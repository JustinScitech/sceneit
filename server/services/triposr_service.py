import os
import sys
from pathlib import Path
from typing import Any, List

import torch
from PIL import Image

from ..settings import Settings


class TripoSRService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model = None
        self.device = None

    async def initialize(self) -> None:
        # Ensure local TripoSR repo is importable (supports running without pip-installing as a package)
        repo_root = Path(__file__).resolve().parents[2]
        local_triposr = repo_root / "TripoSR"
        local_tsr = local_triposr / "tsr"
        for p in [str(local_triposr), str(local_tsr)]:
            if p not in sys.path:
                sys.path.insert(0, p)

        # Lazy import to avoid heavy import time at module import
        from tsr.system import TSR  # type: ignore
        # Device selection with MPS (Apple Silicon) support
        if torch.cuda.is_available() and self.settings.device.startswith("cuda"):
            self.device = self.settings.device
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
        self.model = TSR.from_pretrained(
            self.settings.tsr_model_repo,
            config_name=self.settings.tsr_config_name,
            weight_name=self.settings.tsr_weight_name,
        )
        self.model.renderer.set_chunk_size(self.settings.render_chunk_size)
        self.model.to(self.device)

    async def shutdown(self) -> None:
        # No-op for now
        pass

    @torch.no_grad()
    def run_inference(self, image: Image.Image) -> Any:
        if self.model is None:
            raise RuntimeError("TripoSR model not initialized")
        scene_codes = self.model([image], device=self.device)
        return scene_codes

    def export_obj(self, scene_codes: Any, out_obj_path: str) -> str:
        # Move scene_codes to CPU for mesh extraction (torchmcubes requirement)
        if hasattr(scene_codes, 'to'):
            scene_codes_cpu = scene_codes.to('cpu')
        elif isinstance(scene_codes, (list, tuple)):
            scene_codes_cpu = [sc.to('cpu') if hasattr(sc, 'to') else sc for sc in scene_codes]
        else:
            scene_codes_cpu = scene_codes
        
        # Temporarily move model's isosurface helper to CPU for mesh extraction
        original_device = None
        if hasattr(self.model, 'isosurface_helper') and hasattr(self.model.isosurface_helper, 'to'):
            original_device = next(self.model.isosurface_helper.parameters()).device
            self.model.isosurface_helper.to('cpu')
        
        try:
            meshes = self.model.extract_mesh(scene_codes_cpu, has_vertex_color=True)
            os.makedirs(os.path.dirname(out_obj_path), exist_ok=True)
            meshes[0].export(out_obj_path)
            return out_obj_path
        finally:
            # Restore original device
            if original_device is not None:
                self.model.isosurface_helper.to(original_device)


