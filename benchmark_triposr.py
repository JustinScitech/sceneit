#!/usr/bin/env python3
"""
Benchmark TripoSR performance with different images
"""
import os
import sys
import time
from pathlib import Path

# Add TripoSR to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "TripoSR"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "TripoSR", "tsr"))

def benchmark_image(image_path: Path, model, device: str, output_dir: Path, run_name: str):
    """Benchmark a single image conversion"""
    try:
        print(f"\n🔄 Testing: {image_path.name}")
        
        import torch
        import numpy as np
        from PIL import Image
        import rembg
        
        # Load and preprocess image
        t0 = time.time()
        original_image = Image.open(image_path)
        rembg_session = rembg.new_session()
        image = rembg.remove(original_image, rembg_session)
        
        if image.mode == "RGB":
            image = image.convert("RGBA")
        
        if image.mode == "RGBA":
            image_np = np.array(image).astype(np.float32) / 255.0
            image = image_np[:, :, :3] * image_np[:, :, 3:4] + (1 - image_np[:, :, 3:4]) * 0.5
            image = Image.fromarray((image * 255.0).astype(np.uint8))
        
        dt_preprocess = time.time() - t0
        
        # Run inference
        t0 = time.time()
        with torch.no_grad():
            scene_codes = model([image], device=device)
        dt_inference = time.time() - t0
        
        # Export mesh
        t0 = time.time()
        original_device = device
        if device != 'cpu':
            model.to('cpu')
            if hasattr(scene_codes, 'to'):
                scene_codes = scene_codes.to('cpu')
            elif isinstance(scene_codes, (list, tuple)):
                scene_codes = [sc.to('cpu') if hasattr(sc, 'to') else sc for sc in scene_codes]
        
        try:
            meshes = model.extract_mesh(scene_codes, has_vertex_color=True)
            obj_path = output_dir / f"{run_name}_{image_path.stem}.obj"
            meshes[0].export(str(obj_path))
            dt_export = time.time() - t0
            
            # Get file stats
            size_mb = obj_path.stat().st_size / (1024 * 1024)
            
            # Count vertices/faces
            with open(obj_path, 'r') as f:
                lines = f.readlines()
            vertices = len([l for l in lines if l.startswith('v ')])
            faces = len([l for l in lines if l.startswith('f ')])
            
            total_time = dt_preprocess + dt_inference + dt_export
            
            result = {
                'image': image_path.name,
                'preprocess_time': dt_preprocess,
                'inference_time': dt_inference,
                'export_time': dt_export,
                'total_time': total_time,
                'file_size_mb': size_mb,
                'vertices': vertices,
                'faces': faces,
                'obj_path': obj_path
            }
            
            print(f"  ⏱️  Preprocess: {dt_preprocess:.1f}s")
            print(f"  🧠 Inference:  {dt_inference:.1f}s") 
            print(f"  📐 Export:     {dt_export:.1f}s")
            print(f"  🎯 Total:      {total_time:.1f}s")
            print(f"  📊 Output:     {size_mb:.2f} MB, {vertices:,} vertices, {faces:,} faces")
            print(f"  📁 Saved:      {obj_path}")
            
            return result
            
        finally:
            if original_device != 'cpu':
                model.to(original_device)
                
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def main():
    try:
        import torch
        from tsr.system import TSR
        
        print("🚀 TripoSR Benchmark")
        print("=" * 50)
        
        # Find test images
        root = Path(__file__).resolve().parent
        test_images = []
        
        # TripoSR examples
        examples_dir = root / "TripoSR" / "examples"
        if examples_dir.exists():
            for img in examples_dir.glob("*.png"):
                test_images.append(img)
            for img in examples_dir.glob("*.jpg"):
                test_images.append(img)
        
        # Top-level test images
        for img in root.glob("test*.jpeg"):
            test_images.append(img)
        
        if not test_images:
            print("❌ No test images found!")
            return
            
        print(f"📷 Found {len(test_images)} test images")
        
        # Setup output directory
        output_dir = root / "benchmark_output"
        output_dir.mkdir(exist_ok=True)
        
        # Load model once
        print("🔄 Loading TripoSR model...")
        t0 = time.time()
        model = TSR.from_pretrained("stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt")
        model.renderer.set_chunk_size(8192)
        
        if torch.cuda.is_available():
            device = "cuda:0"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"
            
        model.to(device)
        dt_load = time.time() - t0
        print(f"✅ Model loaded on {device} in {dt_load:.1f}s")
        
        # Benchmark each image
        results = []
        for i, img_path in enumerate(test_images[:3]):  # Limit to first 3 for speed
            result = benchmark_image(img_path, model, device, output_dir, f"test_{i+1}")
            if result:
                results.append(result)
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 BENCHMARK SUMMARY")
        print("=" * 50)
        
        if results:
            avg_total = sum(r['total_time'] for r in results) / len(results)
            avg_inference = sum(r['inference_time'] for r in results) / len(results)
            avg_export = sum(r['export_time'] for r in results) / len(results)
            avg_size = sum(r['file_size_mb'] for r in results) / len(results)
            
            print(f"🎯 Average times:")
            print(f"   Total:     {avg_total:.1f}s")
            print(f"   Inference: {avg_inference:.1f}s")
            print(f"   Export:    {avg_export:.1f}s")
            print(f"📊 Average file size: {avg_size:.2f} MB")
            print(f"📁 All outputs saved to: {output_dir}")
        
    except Exception as e:
        print(f"❌ Benchmark failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
