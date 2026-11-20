"""FashionFit-PK FastAPI Backend & Live Colab GPU Inference Proxy.

- Never runs neural GPU models on the local Windows laptop.
- When COLAB_GPU_URL is set (via env var or POST /api/config/colab), forwards
  /api/vton and /api/segment directly to the live Colab T4/L4 GPU FastAPI server
  running SegFormer-B2 Clothes, FASHN VTON v1.5, and CatVTON.
- Never fabricates try-on or segmentation outputs when GPU is disconnected.
"""

from __future__ import annotations

import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

APP_ROOT = Path(__file__).resolve().parent
DEMO_ASSETS_DIR = APP_ROOT / "demo_assets"
STATIC_DIR = APP_ROOT / "static"
DEMO_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="FashionFit-PK Virtual Try-On & 4-Class Segmentation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/demo-assets", StaticFiles(directory=str(DEMO_ASSETS_DIR)), name="demo-assets")

STATE: dict[str, Any] = {
    "colab_gpu_url": os.environ.get("COLAB_GPU_URL", "").strip().rstrip("/"),
}


class ColabConfig(BaseModel):
    colab_gpu_url: str


VERIFIED_METRICS = {
    "dataset_total_normalized_images": 733,
    "new_catalog_candidates": 600,
    "reviewed_pilot_masks": 27,
    "hanging_kurta_references": 100,
    "synthetic_demo_avatars": 6,
    "segformer_b2_val_miou": 0.7578,
    "segformer_b2_kurta_iou": 0.9085,
    "segformer_b2_bottom_iou": 0.6070,
    "vton_runs_succeeded": 38,
    "vton_runs_total": 38,
    "fashn_vton_runs": 10,
    "catvton_runs": 10,
    "source_mask_ablation_runs": 18,
    "honesty_note": (
        "SegFormer-B2 metrics are from 3 historical pilot validation images (0 GT dupatta). "
        "Synthetic avatars A001-A006 are DEMO ONLY and never enter primary real-person accuracy claims."
    ),
}

DEMO_CATALOG = {
    "avatars": [
        {
            "id": "A001",
            "name": "Synthetic Avatar A001",
            "badge": "DEMO ONLY — SYNTHETIC",
            "profile": "Front-facing neutral pose, full-body studio lighting",
            "color": "#0F5C4D",
        },
        {
            "id": "A002",
            "name": "Synthetic Avatar A002",
            "badge": "DEMO ONLY — SYNTHETIC",
            "profile": "Front-facing neutral pose, modest studio profile",
            "color": "#9B1D4A",
        },
    ],
    "collections": [
        {
            "id": "rehlin_kurtas",
            "name": "REHLIN Stitched Kurtas (Hanging Reference Track)",
            "items": [
                {
                    "id": "DEMO_001",
                    "name": "Embroidered Festive Lawn Kurta #01",
                    "category": "tops",
                    "garment_photo_type": "flat-lay",
                    "fabric": "Embroidered Lawn",
                    "accent": "#0F5C4D",
                },
                {
                    "id": "DEMO_002",
                    "name": "Printed Classic Straight Kameez #02",
                    "category": "tops",
                    "garment_photo_type": "flat-lay",
                    "fabric": "Printed Cambric",
                    "accent": "#9B1D4A",
                },
                {
                    "id": "DEMO_003",
                    "name": "Jacquard Pastel Stitched Kurta #03",
                    "category": "tops",
                    "garment_photo_type": "flat-lay",
                    "fabric": "Cotton Jacquard",
                    "accent": "#1E3A5F",
                },
                {
                    "id": "DEMO_004",
                    "name": "Chikankari Summer Tunic #04",
                    "category": "tops",
                    "garment_photo_type": "flat-lay",
                    "fabric": "Chikankari Lawn",
                    "accent": "#7C3AED",
                },
            ],
        }
    ],
}


def _forward_multipart(url: str, fields: dict[str, str], files: list[tuple[str, str, bytes, str]]) -> bytes:
    """Pure-stdlib multipart/form-data forwarder to the live Colab GPU server."""
    boundary = "----FashionFitPKBoundary7MA4YWxkTrZu0gW"
    body = bytearray()

    for name, val in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(f"{val}\r\n".encode())

    for field_name, filename, content, content_type in files:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode()
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=exc.code, detail=f"Colab GPU server error: {detail}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Colab GPU server at {url}: {exc}") from exc


@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, Any]:
    colab_url = STATE["colab_gpu_url"]
    return {
        "status": "ok",
        "mode": "colab_gpu_live" if colab_url else "local_cpu_awaiting_colab_gpu",
        "colab_gpu_url": colab_url or None,
        "models": [
            {"id": "segformer_b2_clothes", "name": "SegFormer-B2 Clothes (4-Class Visible)", "task": "segmentation"},
            {"id": "fashn_vton_1_5", "name": "FASHN VTON v1.5", "task": "vton"},
            {"id": "catvton", "name": "CatVTON (Inpainting)", "task": "vton"},
        ],
    }


@app.post("/api/config/colab")
def set_colab_url(cfg: ColabConfig) -> dict[str, Any]:
    cleaned = cfg.colab_gpu_url.strip().rstrip("/")
    if cleaned and not (cleaned.startswith("https://") or cleaned.startswith("http://")):
        raise HTTPException(status_code=400, detail="Colab GPU URL must start with https:// or http://")
    STATE["colab_gpu_url"] = cleaned
    return {"status": "updated", "colab_gpu_url": cleaned or None}


@app.get("/api/catalog")
def get_catalog() -> dict[str, Any]:
    return {"catalog": DEMO_CATALOG, "verified_metrics": VERIFIED_METRICS}


@app.post("/api/vton")
async def run_vton(
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    model_id: str = Form("fashn_vton_1_5"),
    category: str = Form("tops"),
    garment_photo_type: str = Form("flat-lay"),
    seed: int = Form(42),
) -> Any:
    colab_url = STATE["colab_gpu_url"]
    if not colab_url:
        raise HTTPException(
            status_code=503,
            detail=(
                "No live Colab GPU server connected. Local Windows GPU execution is disabled by project policy. "
                "Start colab_server/FashionFit_PK_Live_GPU_Server.ipynb on Google Colab (T4 GPU) and paste its "
                "public https://...trycloudflare.com URL into the 'Connect Live Colab GPU' bar."
            ),
        )
    p_bytes = await person_image.read()
    g_bytes = await garment_image.read()
    import json

    raw = _forward_multipart(
        f"{colab_url}/vton",
        fields={
            "model_id": model_id,
            "category": category,
            "garment_photo_type": garment_photo_type,
            "seed": str(seed),
        },
        files=[
            ("person_image", person_image.filename or "person.jpg", p_bytes, person_image.content_type or "image/jpeg"),
            ("garment_image", garment_image.filename or "garment.jpg", g_bytes, garment_image.content_type or "image/jpeg"),
        ],
    )
    return json.loads(raw.decode("utf-8"))


@app.post("/api/segment")
async def run_segmentation(
    image: UploadFile = File(...),
    seg_variant: str = Form("adapted"),
) -> Any:
    colab_url = STATE["colab_gpu_url"]
    if not colab_url:
        raise HTTPException(
            status_code=503,
            detail=(
                "No live Colab GPU server connected. Start colab_server/FashionFit_PK_Live_GPU_Server.ipynb on "
                "Google Colab (T4 GPU) and paste its public URL into the 'Connect Live Colab GPU' bar."
            ),
        )
    img_bytes = await image.read()
    import json

    raw = _forward_multipart(
        f"{colab_url}/segment",
        fields={"seg_variant": seg_variant},
        files=[("image", image.filename or "outfit.jpg", img_bytes, image.content_type or "image/jpeg")],
    )
    return json.loads(raw.decode("utf-8"))
