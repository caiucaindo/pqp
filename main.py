"""
PDF Editor Application
Desktop application with PyWebView + FastAPI backend
Serves React frontend in a native WebView2 window
"""
import os
import sys
import threading
from pathlib import Path
from fastapi import FastAPI, staticfiles
from fastapi.responses import FileResponse
import uvicorn
import webview

# Get the application root directory
if getattr(sys, 'frozen', False):
    # Running as compiled executable; files are extracted to _MEIPASS in onefile mode
    app_root = Path(getattr(sys, '_MEIPASS', Path(sys.executable).parent))
else:
    # Running as script
    app_root = Path(__file__).parent

# Path to the frontend dist folder
frontend_dist = app_root / 'app' / 'dist'

# Create FastAPI app
app = FastAPI(title="PDF Editor")

# Mount static files (frontend)
if frontend_dist.exists():
    app.mount('/static', staticfiles.StaticFiles(directory=frontend_dist), name='static')

@app.get('/')
async def root():
    """Serve index.html"""
    index_file = frontend_dist / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return {'message': 'PDF Editor - Frontend not found'}

@app.get('/api/health')
async def health():
    """Health check endpoint"""
    return {'status': 'ok', 'app': 'PDF Editor'}

@app.get('/{full_path:path}')
async def serve_frontend(full_path: str):
    """Serve frontend files (for SPA routing)"""
    file_path = frontend_dist / full_path
    
    # Prevent directory traversal attacks
    try:
        file_path.resolve().relative_to(frontend_dist.resolve())
    except ValueError:
        index_file = frontend_dist / 'index.html'
        if index_file.exists():
            return FileResponse(index_file)
        return {'message': 'Not found'}
    
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    
    # Serve index.html for all other routes (SPA routing)
    index_file = frontend_dist / 'index.html'
    if index_file.exists():
        return FileResponse(index_file)
    return {'message': 'Not found'}

def start_server():
    """Start FastAPI server in background thread"""
    uvicorn.run(
        app,
        host='127.0.0.1',
        port=5173,
        log_level='warning',
        access_log=False
    )

def main():
    """Main entry point"""
    # Check if frontend exists
    if not frontend_dist.exists():
        raise FileNotFoundError(f"Frontend dist not found at {frontend_dist}. Run npm run build in app directory first.")
    
    # Start server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Give server a moment to start
    import time
    time.sleep(1)
    
    # Create PyWebView window
    window = webview.create_window(
        title='PDF Editor',
        url='http://127.0.0.1:5173',
        width=1400,
        height=900,
        min_size=(800, 600),
        background_color='#ffffff'
    )
    
    # Start webview (blocks until window is closed)
    webview.start(debug=False)

if __name__ == '__main__':
    main()
