# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec moved into desktop/
Assumes execution from repo root: pyinstaller desktop/build.spec
"""
import os
import sys

block_cipher = None
# Paths relative to current working directory (repo root)
repo_root = os.getcwd()
app_dist = os.path.join(repo_root, 'app', 'dist')
main_py = os.path.join(repo_root, 'desktop', 'main.py')
custom_hooks = os.path.join(repo_root, 'desktop', 'hooks')

# Tcl/Tk runtime data required by PyInstaller's tkinter runtime hook.
# In a venv, sys.executable points to .venv\Scripts, while Tcl/Tk lives in
# the base Python installation.
python_roots = [
    sys.base_prefix,
    sys.prefix,
    os.path.dirname(os.path.dirname(sys.executable)),
    os.path.dirname(sys.executable),
]

extra_datas = []
for python_root in python_roots:
    tcl_src = os.path.join(python_root, 'tcl', 'tcl8.6')
    tk_src = os.path.join(python_root, 'tcl', 'tk8.6')
    if os.path.isdir(tcl_src) and os.path.isdir(tk_src):
        extra_datas.extend([
            (tcl_src, 'tcl'),
            (tk_src, 'tk'),
        ])
        break

if not extra_datas:
    raise FileNotFoundError('Tcl/Tk runtime folders were not found for PyInstaller packaging.')

a = Analysis(
    [main_py],
    pathex=[repo_root],
    binaries=[],
    datas=[
        (app_dist, './app/dist'),
        *extra_datas,
    ],
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'pydantic',
        'starlette',
        'webview',
    ],
    hookspath=[custom_hooks],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[
        'tkinter',
        '_tkinter',
        'tcl',
        'tk',
    ],
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
    name='PQP',
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
    icon='assets/icon.ico',
)
