#!/usr/bin/env python3
"""
Direct TripoSR test - bypasses the server to test the model pipeline directly
"""
import os
import sys
import time
from pathlib import Path

# Add TripoSR to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "TripoSR"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "TripoSR", "tsr"))

def main():
    try:
        print("🔄 Importing dependencies...")
        import torch
        import numpy as np
        from PIL import Image
        import rembg
        from tsr.system import TSR
        
        print(f"✅ PyTorch: {torch.__version__}")
        print(f"✅ CUDA available: {torch.cuda.is_available()}")
        print(f"✅ MPS available: {torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False}")
        
        # Find test image
        root = Path(__file__).resolve().parent
        test_images = [
            root / "TripoSR" / "examples" / "chair.png",
            root / "test1.jpeg",
            root / "test2.jpeg",
        ]
        
        test_image = None
        for img_path in test_images:
            if img_path.exists():
                test_image = img_path
                break
        
        if not test_image:
            print("❌ No test image found!")
            return
            
        print(f"📷 Using test image: {test_image}")
        
        # Load and preprocess image
        print("🔄 Loading and preprocessing image...")
        original_image = Image.open(test_image)
        
        # Background removal
        rembg_session = rembg.new_session()
        image = rembg.remove(original_image, rembg_session)
        
        # Ensure RGBA
        if image.mode == "RGB":
            image = image.convert("RGBA")
        
        # Resize and composite (simplified version)
        if image.mode == "RGBA":
            image_np = np.array(image).astype(np.float32) / 255.0
            image = image_np[:, :, :3] * image_np[:, :, 3:4] + (1 - image_np[:, :, 3:4]) * 0.5
            image = Image.fromarray((image * 255.0).astype(np.uint8))
        
        print("✅ Image preprocessed")
        
        # Load TripoSR model
        print("🔄 Loading TripoSR model...")
        t0 = time.time()
        model = TSR.from_pretrained("stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt")
        model.renderer.set_chunk_size(8192)
        
        # Device selection
        if torch.cuda.is_available():
            device = "cuda:0"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"
            
        model.to(device)
        dt_load = time.time() - t0
        print(f"✅ Model loaded on {device} in {dt_load:.1f}s")
        
        # Run inference
        print("🔄 Running TripoSR inference...")
        t0 = time.time()
        with torch.no_grad():
            scene_codes = model([image], device=device)
        dt_inference = time.time() - t0
        print(f"✅ Inference completed in {dt_inference:.1f}s")
        
        # Export mesh
        print("🔄 Extracting and exporting mesh...")
        t0 = time.time()
        
        # For MPS compatibility, move entire model to CPU for mesh extraction
        original_device = device
        if device != 'cpu':
            print("🔄 Moving model to CPU for mesh extraction...")
            model.to('cpu')
            if hasattr(scene_codes, 'to'):
                scene_codes = scene_codes.to('cpu')
            elif isinstance(scene_codes, (list, tuple)):
                scene_codes = [sc.to('cpu') if hasattr(sc, 'to') else sc for sc in scene_codes]
        
        try:
            meshes = model.extract_mesh(scene_codes, has_vertex_color=True)
            
            # Save OBJ file
            output_dir = root / "output"
            output_dir.mkdir(exist_ok=True)
            obj_path = output_dir / "test_mesh.obj"
            meshes[0].export(str(obj_path))
            
            dt_export = time.time() - t0
            print(f"✅ Mesh exported in {dt_export:.1f}s")
            
            # File info
            size_mb = obj_path.stat().st_size / (1024 * 1024)
            print(f"📁 OBJ file saved: {obj_path.absolute()}")
            print(f"📊 File size: {size_mb:.2f} MB")
            
            # Try to get mesh stats
            try:
                with open(obj_path, 'r') as f:
                    lines = f.readlines()
                vertices = len([l for l in lines if l.startswith('v ')])
                faces = len([l for l in lines if l.startswith('f ')])
                print(f"📊 Vertices: {vertices:,}, Faces: {faces:,}")
            except:
                pass
                
        finally:
            # Restore original device
            if original_device != 'cpu':
                print(f"🔄 Restoring model to {original_device}...")
                model.to(original_device)
        
        total_time = dt_load + dt_inference + dt_export
        print(f"🎉 Total time: {total_time:.1f}s (load: {dt_load:.1f}s, inference: {dt_inference:.1f}s, export: {dt_export:.1f}s)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
