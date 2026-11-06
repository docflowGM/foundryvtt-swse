#!/usr/bin/env python3
"""Backward-compatible entrypoint for dynamic local multi-book progress.

No GitHub writes. Use the current ledger-derived counter, never fixed SGD totals.
"""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().with_name('build_droid_rolling_progress.py')),run_name='__main__')
