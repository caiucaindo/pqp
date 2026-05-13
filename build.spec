# -*- mode: python ; coding: utf-8 -*-
"""
PDF Editor PyInstaller Build Specification
Builds a single executable containing FastAPI backend + React frontend
"""
import os
from pathlib import Path

block_cipher = None
# Use current working directory as root
root_dir = Path('D:\\CODE\\EDITOR PDF')

a = Analysis(
    ['main.py'],
    pathex=[str(root_dir)],
    binaries=[],
    datas=[
        (str(root_dir / 'app' / 'dist'), './app/dist'),
    ],
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'pydantic',
        'starlette',
        'webview',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='PDF Editor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
