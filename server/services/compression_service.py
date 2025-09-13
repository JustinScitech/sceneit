import gzip
import os
import zipfile


def gzip_file(input_path: str, output_path: str) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(input_path, "rb") as fin, gzip.open(output_path, "wb") as fout:
        while True:
            chunk = fin.read(1024 * 1024)
            if not chunk:
                break
            fout.write(chunk)
    return output_path


def zip_file(input_path: str, output_path: str, arcname: str = "mesh.obj") -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(input_path, arcname=arcname)
    return output_path


