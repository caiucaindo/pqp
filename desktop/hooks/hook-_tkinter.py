"""
Local override for PyInstaller tkinter hook.

This project does not use tkinter. On some Python 3.12 environments,
PyInstaller's default tkinter hook crashes when probing Tcl/Tk paths.
Keeping this hook empty prevents that probe.
"""

