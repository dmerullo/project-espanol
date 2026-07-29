"""
export_data.py — run this ONCE, locally, wherever your original TSV + poems
folder currently live. It does not touch pythonanywhere or any server; it just
reads your existing files and writes two things into ./data/:

  data/metadata.json      one small JSON record per poem (stats + info)
  data/poems/<poemURL>.txt   one plain-text file per poem (unchanged content)

Those two outputs are everything the static site (index.html) needs. Commit
the whole `data/` folder to your repo and GitHub Pages serves it as-is —
no server, no Python, at runtime.

Usage:
    python export_data.py

Edit the two paths below to match where your files currently live.
"""

import os
import json
import shutil
import pandas as pd

# ── EDIT THESE TWO PATHS ─────────────────────────────────────────────
TSV_PATH = "/home/dmerullo/github/private-project-espanol/analysis/analysis2_clustered_new.tsv"
POEMS_DIR = "/home/dmerullo/github/private-project-espanol/source/poems"
# ──────────────────────────────────────────────────────────────────────

OUTPUT_DIR = "data"
METADATA_OUT = os.path.join(OUTPUT_DIR, "metadata.json")
POEMS_OUT_DIR = os.path.join(OUTPUT_DIR, "poems")

# Every column the frontend needs to filter, plot, or display.
# (Matches the columns referenced in your original Dash app.)
KEEP_COLUMNS = [
    "poemURL", "title", "author", "nationality", "birth", "death", "level",
    "ratio", "verbCount", "wordCount",
    "present", "preterite", "future", "imperfect", "conditional", "perfect",
    "pluperfect", "future perfect", "conditional perfect",
    "anterior preterite", "present subjunctive", "imperfect subjunctive",
    "future subjunctive", "perfect subjunctive", "pluperfect subjunctive",
    "subjunctive future perfect", "indicative", "subjunctive",
    "regular", "irregular", "infinitive",
]


def main():
    os.makedirs(POEMS_OUT_DIR, exist_ok=True)

    df = pd.read_csv(TSV_PATH, sep="\t")

    missing = [c for c in KEEP_COLUMNS if c not in df.columns]
    if missing:
        print(f"Warning: these expected columns are missing from the TSV and "
              f"will be skipped: {missing}")

    present_cols = [c for c in KEEP_COLUMNS if c in df.columns]
    df_export = df[present_cols].copy()

    # NaN -> None so it serializes as JSON null, not the string "NaN"
    records = json.loads(df_export.to_json(orient="records"))

    with open(METADATA_OUT, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(records)} records to {METADATA_OUT}")

    # Copy each poem's .txt file, named by poemURL, into data/poems/
    copied, missing_files = 0, []
    for poem_url in df_export["poemURL"].astype(str):
        src = os.path.join(POEMS_DIR, poem_url + ".txt")
        dst = os.path.join(POEMS_OUT_DIR, poem_url + ".txt")
        if os.path.exists(src):
            shutil.copyfile(src, dst)
            copied += 1
        else:
            missing_files.append(src)

    print(f"Copied {copied} poem files to {POEMS_OUT_DIR}")
    if missing_files:
        print(f"Warning: {len(missing_files)} poem files were not found, "
              f"e.g. {missing_files[:5]}")


if __name__ == "__main__":
    main()
