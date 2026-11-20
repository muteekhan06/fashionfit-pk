#!/usr/bin/env python3
"""Generate FashionFit_PK_Live_GPU_Server.ipynb for 1-click Colab T4 GPU live inference."""

from __future__ import annotations

import json
from pathlib import Path

OUT_NB = Path(__file__).resolve().parent / "FashionFit_PK_Live_GPU_Server.ipynb"


def md(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": [l + "\n" for l in text.strip().splitlines()]}


def code(text: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [l + "\n" for l in text.strip().splitlines()],
    }


nb = {
    "cells": [
        md(
            "# FashionFit-PK — Live Colab GPU Inference Server (`SegFormer-B2` + `FASHN VTON 1.5` + `CatVTON`)\n\n"
            "Run all cells on a **Google Colab T4 / L4 GPU** runtime. It mounts your `FashionFit_PK_Research_V3_2026-11-17` "
            "Google Drive package, loads your verified `fashionfit` adapters, starts FastAPI on port `8000`, and prints a free "
            "`https://...trycloudflare.com` URL to paste into the FashionFit-PK Web App."
        ),
        code(
            """
from google.colab import drive
import os, sys, subprocess
from pathlib import Path

drive.mount('/content/drive')
ROOT = Path('/content/drive/MyDrive/FashionFit_PK_Research_V3_2026-11-17')
CODE_DIR = ROOT / '07_CODE'
assert CODE_DIR.exists(), f'Missing {CODE_DIR}'

!pip install -q fastapi uvicorn python-multipart "diffusers>=0.30" "transformers>=4.44,<4.49" accelerate huggingface_hub onnxruntime-gpu einops
!pip install -q "git+https://github.com/fashn-AI/fashn-human-parser.git"
!pip install -q --no-deps "git+https://github.com/fashn-AI/fashn-vton-1.5.git@7c0f10af3f91ad4048fe9729c470a13ef905d25a"
!pip install -q --no-deps -e "{CODE_DIR}"
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
"""
        ),
        code(
            """
%%writefile /content/gpu_api.py
import base64, io, gc, torch, numpy as np
from PIL import Image
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fashionfit.adapters.segformer import SegFormerClothesAdapter
from fashionfit.adapters.fashn import FashnVtonAdapter
from fashionfit.adapters.catvton import CatVtonAdapter
from fashionfit.reporting import colorize_mask

app = FastAPI(title="FashionFit-PK Live Colab GPU API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def img_to_b64(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.convert("RGB").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

@app.get("/health")
def health():
    return {"status": "ok", "cuda": torch.cuda.is_available(), "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none"}

@app.post("/segment")
async def segment(image: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await image.read())).convert("RGB")
    seg = SegFormerClothesAdapter()
    seg.load()
    out = seg.predict(img)
    mask = out["mask"]
    rgb = np.asarray(img, dtype=np.uint8)
    overlay = Image.fromarray((0.55 * rgb + 0.45 * colorize_mask(mask)).astype(np.uint8))
    kurta_cutout = Image.fromarray(np.where((mask == 1)[:, :, None], rgb, 255).astype(np.uint8))
    total = max(mask.size, 1)
    ratios = {
        "other": round(float(np.mean(mask == 0) * 100), 2),
        "kurta_kameez": round(float(np.mean(mask == 1) * 100), 2),
        "bottom": round(float(np.mean(mask == 2) * 100), 2),
        "dupatta": round(float(np.mean(mask == 3) * 100), 2),
    }
    del seg; gc.collect(); torch.cuda.empty_cache()
    return {
        "model_id": "mattmdjaga/segformer_b2_clothes",
        "overlay_image": img_to_b64(overlay),
        "kurta_cutout_image": img_to_b64(kurta_cutout),
        "class_coverage_pct": ratios,
        "seconds": out["seconds"],
        "peak_vram_mb": out["peak_vram_mb"],
    }

@app.post("/vton")
async def vton(
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    model_id: str = Form("fashn_vton_1_5"),
    category: str = Form("tops"),
    garment_photo_type: str = Form("flat-lay"),
    seed: int = Form(42),
):
    p_img = Image.open(io.BytesIO(await person_image.read())).convert("RGB")
    g_img = Image.open(io.BytesIO(await garment_image.read())).convert("RGB")

    if model_id == "catvton":
        seg = SegFormerClothesAdapter(); seg.load()
        m = ((seg.predict(p_img)["mask"] == 1).astype(np.uint8) * 255)
        t_mask = Image.fromarray(m, mode="L")
        del seg; gc.collect(); torch.cuda.empty_cache()
        adapter = CatVtonAdapter(); adapter.load()
        res = adapter.run_tryon(p_img, g_img, target_mask=t_mask, seed=seed)
    else:
        adapter = FashnVtonAdapter(); adapter.load()
        res = adapter.run_tryon(p_img, g_img, category=category, garment_photo_type=garment_photo_type, seed=seed)

    b64 = img_to_b64(res["image"])
    del adapter; gc.collect(); torch.cuda.empty_cache()
    return {
        "model_id": model_id,
        "result_image": b64,
        "seconds": res["seconds"],
        "peak_vram_mb": res["peak_vram_mb"],
        "seed": seed,
    }
"""
        ),
        code(
            """
import subprocess, time, re

uvicorn_proc = subprocess.Popen(["uvicorn", "gpu_api:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/content"])
time.sleep(3)
tunnel = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
)
for line in tunnel.stdout:
    m = re.search(r"https://[a-z0-9-]+\\.trycloudflare\\.com", line)
    if m:
        print("=" * 70)
        print("LIVE COLAB GPU URL (paste into FashionFit-PK Web App):", m.group(0))
        print("=" * 70)
        break
"""
        ),
    ],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10.0"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

OUT_NB.write_text(json.dumps(nb, indent=2), encoding="utf-8")
print("Wrote", OUT_NB)
