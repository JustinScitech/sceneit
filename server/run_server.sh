#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR/.."

python -m venv .venv || true
source .venv/bin/activate
pip install -U pip
pip install -r server/requirements.txt

# Ensure local TripoSR repo is importable (handle unset PYTHONPATH under set -u)
: "${PYTHONPATH:=}"
export PYTHONPATH="${PYTHONPATH}:$(pwd)/TripoSR:$(pwd)/TripoSR/tsr"

exec uvicorn server.app:app --host 0.0.0.0 --port 8000


