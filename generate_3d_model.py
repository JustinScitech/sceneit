import os
import sys
import tempfile
import uuid
import io
from pathlib import Path
from typing import Any

import torch
import trimesh
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Add TripoSG to path
sys.path.append(os.path.join(os.path.dirname(__file__), "TripoSG"))

from triposg.pipelines.pipeline_triposg import TripoSGPipeline
from TripoSG.scripts.image_process import prepare_image
from TripoSG.scripts.briarmbg import BriaRMBG

app = FastAPI(title="TripoSG API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
pipe = None
rmbg_net = None
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32


@app.on_event("startup")
async def startup_event():
    global pipe, rmbg_net
    
    print("Loading models...")
    
    # Set up paths
    triposg_weights_dir = "TripoSG/pretrained_weights/TripoSG"
    rmbg_weights_dir = "TripoSG/pretrained_weights/RMBG-1.4"
    
    # Download weights if they don't exist
    if not os.path.exists(triposg_weights_dir):
        print("Downloading TripoSG weights...")
        from huggingface_hub import snapshot_download
        snapshot_download(repo_id="VAST-AI/TripoSG", local_dir=triposg_weights_dir)
    
    if not os.path.exists(rmbg_weights_dir):
        print("Downloading RMBG weights...")
        from huggingface_hub import snapshot_download
        snapshot_download(repo_id="briaai/RMBG-1.4", local_dir=rmbg_weights_dir)
    
    # Initialize background removal model
    rmbg_net = BriaRMBG.from_pretrained(rmbg_weights_dir).to(device)
    rmbg_net.eval()
    
    # Initialize TripoSG pipeline
    pipe = TripoSGPipeline.from_pretrained(triposg_weights_dir).to(device, dtype)
    
    print(f"Models loaded successfully on {device}")


@torch.no_grad()
def run_triposg(
    pipe: Any,
    image_path: str,
    rmbg_net: Any,
    seed: int = 42,
    num_inference_steps: int = 50,
    guidance_scale: float = 7.0,
    faces: int = -1,
) -> trimesh.Scene:
    """Run TripoSG inference"""
    
    # Prepare image (remove background, etc.) - this expects a file path
    img_pil = prepare_image(image_path, bg_color=np.array([1.0, 1.0, 1.0]), rmbg_net=rmbg_net)
    
    # Run inference
    outputs = pipe(
        image=img_pil,
        generator=torch.Generator(device=pipe.device).manual_seed(seed),
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
    ).samples[0]
    
    # Create mesh
    mesh = trimesh.Trimesh(outputs[0].astype(np.float32), np.ascontiguousarray(outputs[1]))
    
    # Optionally simplify mesh
    if faces > 0 and mesh.faces.shape[0] > faces:
        mesh = simplify_mesh(mesh, faces)
    
    return mesh


def simplify_mesh(mesh: trimesh.Trimesh, n_faces: int) -> trimesh.Trimesh:
    """Simplify mesh using pymeshlab"""
    try:
        import pymeshlab
        
        # Convert to pymeshlab mesh
        ms = pymeshlab.MeshSet()
        ms.add_mesh(pymeshlab.Mesh(vertex_matrix=mesh.vertices, face_matrix=mesh.faces))
        
        # Simplify
        ms.meshing_merge_close_vertices()
        ms.meshing_decimation_quadric_edge_collapse(targetfacenum=n_faces)
        
        # Convert back to trimesh
        simplified = ms.current_mesh()
        return trimesh.Trimesh(vertices=simplified.vertex_matrix(), faces=simplified.face_matrix())
    except ImportError:
        print("pymeshlab not available, skipping mesh simplification")
        return mesh
    except Exception as e:
        print(f"Mesh simplification failed: {e}")
        return mesh


@app.get("/health")
async def health():
    return {"status": "ok", "device": device, "models_loaded": pipe is not None and rmbg_net is not None}


@app.post("/convert")
async def convert_image_to_3d(
    file: UploadFile = File(...),
    seed: int = 42,
    num_inference_steps: int = 50,
    guidance_scale: float = 7.0,
    faces: int = -1,
    output_format: str = "glb"  # glb, obj, ply
):
    """Convert an image to a 3D model"""
    
    if pipe is None or rmbg_net is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")
    
    # Validate file
    if not file.filename or not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Only PNG and JPEG images are supported")
    
    try:
        # Read and validate image
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=413, detail="Image too large")
        
        # Load image
        image = Image.open(io.BytesIO(contents))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        print(f"Processing image: {image.size}, mode: {image.mode}")
        
        # Save image to temporary file (TripoSG expects file path)
        job_id = uuid.uuid4().hex[:8]
        temp_dir = tempfile.gettempdir()
        temp_image_path = os.path.join(temp_dir, f"input_{job_id}.jpg")
        image.save(temp_image_path, "JPEG", quality=95)
        
        try:
            # Run TripoSG
            mesh = run_triposg(
                pipe=pipe,
                image_path=temp_image_path,
                rmbg_net=rmbg_net,
                seed=seed,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                faces=faces
            )
        finally:
            # Clean up temporary image file
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)
        
        # Create temporary output file
        job_id = uuid.uuid4().hex[:8]
        temp_dir = tempfile.gettempdir()
        
        if output_format.lower() == "glb":
            output_path = os.path.join(temp_dir, f"mesh_{job_id}.glb")
            mesh.export(output_path)
            media_type = "model/gltf-binary"
        elif output_format.lower() == "obj":
            output_path = os.path.join(temp_dir, f"mesh_{job_id}.obj")
            mesh.export(output_path)
            media_type = "application/octet-stream"
        elif output_format.lower() == "ply":
            output_path = os.path.join(temp_dir, f"mesh_{job_id}.ply")
            mesh.export(output_path)
            media_type = "application/octet-stream"
        else:
            raise HTTPException(status_code=400, detail="Unsupported output format. Use 'glb', 'obj', or 'ply'")
        
        print(f"Generated mesh saved to {output_path}, size: {os.path.getsize(output_path)} bytes")
        
        # Return the file
        return FileResponse(
            path=output_path,
            media_type=media_type,
            filename=f"mesh_{job_id}.{output_format.lower()}",
            background=None  # File will be cleaned up by OS temp cleanup
        )
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
