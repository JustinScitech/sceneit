import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "TripoSR"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "TripoSR", "tsr"))

try:
    import torch
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"MPS available: {torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False}")
    
    from tsr.system import TSR
    print("✅ Successfully imported TSR")
    
    model = TSR.from_pretrained("stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt")
    print("✅ Successfully loaded TripoSR model")
    
    device = "mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() else "cpu"
    model.to(device)
    print(f"✅ Model moved to device: {device}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
