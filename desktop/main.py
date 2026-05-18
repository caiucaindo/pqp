"""
PQP - PDF Que Pariu - desktop entry
Moved into `desktop/` folder; resolves frontend path relative to repo root.
"""
import os
import sys
import threading
from pathlib import Path
from fastapi import FastAPI, staticfiles
from fastapi.responses import FileResponse
import uvicorn
import webview

# app_root: when frozen, use _MEIPASS extraction dir; otherwise, repo root (parent of this folder)
app_root = Path(getattr(sys, '_MEIPASS', Path(__file__).parent.parent))

# Path to the frontend dist folder
frontend_dist = app_root / 'app' / 'dist'

# Create FastAPI app
app = FastAPI(
    title="PQP - PDF Que Pariu",
    description="Editor de PDF simples, rápido e sem frescura."
)

# Mount static files (frontend)
if frontend_dist.exists():
    app.mount('/static', staticfiles.StaticFiles(directory=frontend_dist), name='static')

@app.get('/')
async def root():
    index_file = frontend_dist / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return {'message': 'PQP frontend not found'}

@app.get('/api/health')
async def health():
    return {'status': 'ok', 'app': 'PQP'}

@app.get('/{full_path:path}')
async def serve_frontend(full_path: str):
    file_path = frontend_dist / full_path
    try:
        file_path.resolve().relative_to(frontend_dist.resolve())
    except ValueError:
        index_file = frontend_dist / 'index.html'
        if index_file.exists():
            return FileResponse(index_file)
        return {'message': 'Not found'}
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index_file = frontend_dist / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return {'message': 'Not found'}

def start_server():
    uvicorn.run(app, host='127.0.0.1', port=5173, log_level='warning', access_log=False)

def main():
    if not frontend_dist.exists():
        raise FileNotFoundError(f"Frontend dist not found at {frontend_dist}. Run npm run build in app directory first.")
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    import time
    time.sleep(1)
    webview.create_window(title='PQP - PDF Que Pariu', url='http://127.0.0.1:5173', width=1400, height=900, min_size=(800,600), background_color='#ffffff')
    webview.start(debug=False)

if __name__ == '__main__':
    main()
