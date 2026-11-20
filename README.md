# FashionFit-PK Full-Stack Web App & Live Colab GPU Inference Bridge

Original React + Vite + Tailwind CSS frontend + FastAPI backend + 1-click Google Colab GPU inference server (`SegFormer-B2 Clothes`, `FASHN VTON v1.5`, `CatVTON`).

## 1. Run Backend Locally (CPU Proxy Only — Never Runs Local GPU)
```powershell
cd "C:\Users\mutee\Downloads\AI Virtual Try-On FYP\FashionFit_PK_WebApp\backend"
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## 2. Run Frontend Locally
```powershell
cd "C:\Users\mutee\Downloads\AI Virtual Try-On FYP\FashionFit_PK_WebApp\frontend"
npm install
npm run dev
```
Open `http://localhost:5173`.

## 3. Connect Real Working Neural Models (Google Colab T4/L4 GPU)
1. Upload `colab_server/FashionFit_PK_Live_GPU_Server.ipynb` to Google Colab (**T4 GPU** runtime).
2. Run all cells — it mounts your `FashionFit_PK_Research_V3_2026-11-17` Drive folder, loads `SegFormerClothesAdapter`, `FashnVtonAdapter`, and `CatVtonAdapter`, and prints a free `https://xxxx.trycloudflare.com` URL.
3. Click **Launch Studio** in the web app, paste that URL into the **Connect GPU** bar, and run real 4-class segmentation and virtual try-on on any uploaded Pakistani outfit photo.
