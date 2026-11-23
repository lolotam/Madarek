"""Generate Madarek's English recordings with Kokoro ONNX and SoundFile.

Install kokoro-onnx and soundfile, then pass the model and voices from the model-files-v1.0 release.
Run with Node 24 on PATH. Existing recordings are reused unless --overwrite is set.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess

from kokoro_onnx import Kokoro
import numpy as np
import onnxruntime as ort
import soundfile as sf


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("voices", type=Path)
    parser.add_argument("--voice", default="bf_emma")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    plan = json.loads(subprocess.check_output(
        ["node", "scripts/english-audio-plan.mjs"], cwd=ROOT, encoding="utf-8"
    ))
    directory = ROOT / "public" / "english" / "audio"
    directory.mkdir(parents=True, exist_ok=True)
    remaining = {
        name: text for name, text in plan.items()
        if args.overwrite or not (directory / f"{name}.mp3").is_file()
    }
    if not remaining:
        print("All clips already exist.")
        return

    settings = ort.SessionOptions()
    settings.intra_op_num_threads = 1
    settings.inter_op_num_threads = 1
    session = ort.InferenceSession(str(args.model), sess_options=settings, providers=["CPUExecutionProvider"])
    voice = Kokoro.from_session(session, str(args.voices))

    def generate(item):
        name, text = item
        wave, rate = voice.create(text, voice=args.voice, speed=0.9, lang="en-gb")
        peak = np.max(np.abs(wave), initial=0)
        if not np.isfinite(peak) or peak < 0.005:
            raise ValueError(f"No audible speech for {name}")
        wave = np.pad(wave * min(2.0, 0.8 / peak), (int(rate * 0.08), int(rate * 0.15)))
        temporary = directory / f".{name}.tmp"
        try:
            sf.write(
                temporary, wave, rate, format="MP3", subtype="MPEG_LAYER_III",
                compression_level=0.75, bitrate_mode="VARIABLE",
            )
            temporary.replace(directory / f"{name}.mp3")
        finally:
            temporary.unlink(missing_ok=True)

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for index, _ in enumerate(pool.map(generate, remaining.items()), 1):
            if index % 25 == 0 or index == len(remaining):
                print(f"Generated {index}/{len(remaining)} clips.", flush=True)


if __name__ == "__main__":
    main()
