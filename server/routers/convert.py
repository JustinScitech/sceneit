import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import StreamingResponse, Response

from ..settings import get_settings
from ..services.streaming import iter_file
from ..services.compression_service import gzip_file, zip_file
from ..services.concurrency import get_inference_semaphore


router = APIRouter(prefix="/convert", tags=["convert"])


def _tmp_paths(base_dir: str, job_id: str):
    work_dir = os.path.join(base_dir, job_id)
    obj_path = os.path.join(work_dir, "mesh.obj")
    gz_path = os.path.join(work_dir, "mesh.obj.gz")
    zip_path = os.path.join(work_dir, "mesh.zip")
    return work_dir, obj_path, gz_path, zip_path


@router.post("")
async def convert(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    compress: bool = True,
    compression: str = "gzip",  # gzip | zip
):
    settings = request.app.state.settings
    image_service = request.app.state.image_service
    triposr_service = request.app.state.triposr_service

    image_service.validate_image(file)
    img = await image_service.load_image(file)
    img = image_service.preprocess(img, foreground_ratio=0.85)

    sem = get_inference_semaphore()
    async with sem:
        scene_codes = triposr_service.run_inference(img)

    job_id = uuid.uuid4().hex
    work_dir, obj_path, gz_path, zip_path = _tmp_paths(settings.tmp_dir, job_id)
    os.makedirs(work_dir, exist_ok=True)

    triposr_service.export_obj(scene_codes, obj_path)

    if compress:
        if compression == "zip":
            out_path = zip_file(obj_path, zip_path)
            media_type = "application/zip"
            filename = "mesh.zip"
        else:
            out_path = gzip_file(obj_path, gz_path)
            media_type = "application/gzip"
            filename = "mesh.obj.gz"
        return StreamingResponse(
            iter_file(out_path),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    # Raw OBJ streaming
    return StreamingResponse(
        iter_file(obj_path),
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=mesh.obj"},
    )


