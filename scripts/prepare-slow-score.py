"""Prepare optional slow-playback copies. The native 1x recording is never retimed."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
for suffix,filters,duration in [('quarter','atempo=0.5,atempo=0.5',760),('tenth','atempo=0.5,atempo=0.5,atempo=0.5,atempo=0.8',1900)]:
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(ROOT/'public/audio/descent-score-native.mp3'),
        '-af',filters+',apad','-t',str(duration),'-c:a','libmp3lame','-b:a','96k',
        str(ROOT/f'public/audio/descent-score-native-{suffix}.mp3')],check=True)
    print(f'Prepared optional {suffix}-speed copy',flush=True)
