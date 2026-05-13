# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec moved into desktop/
Assumes execution from repo root: pyinstaller desktop/build.spec
"""
import os

block_cipher = None
# Paths relative to current working directory (repo root)
repo_root = os.getcwd()
app_dist = os.path.join(repo_root, 'app', 'dist')
main_py = os.path.join(repo_root, 'desktop', 'main.py')

a = Analysis(
    [main_py],
    pathex=[repo_root],
    binaries=[],
    datas=[
        (app_dist, './app/dist'),
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
