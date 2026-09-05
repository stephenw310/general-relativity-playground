"""Generate the flight score on fal.ai; credentials never enter the app bundle.
Run with FAL_KEY in the environment. An existing request file is resumed, not resubmitted.
"""
import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--key-file', type=Path)
parser.add_argument('--request-file', type=Path, required=True)
parser.add_argument('--output', default='descent-score-native.mp3')
args = parser.parse_args()
key = args.key_file.read_text().strip() if args.key_file else os.environ['FAL_KEY']

def api(url, payload=None):
    if urllib.parse.urlparse(url).hostname != 'queue.fal.run':
        raise ValueError('Unexpected API host')
    request = urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization': 'Key ' + key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'fal API returned {error.code}: {error.read().decode()[:1200]}') from None

if args.request_file.exists():
    job = json.loads(args.request_file.read_text())
else:
    plan = json.loads((ROOT / 'scripts/descent-music-plan.json').read_text())
    job = api('https://queue.fal.run/fal-ai/elevenlabs/music', plan)
    args.request_file.write_text(json.dumps(job))
    print('Submitted score generation:', job['request_id'], flush=True)

last_status = None
for _ in range(120):
    status = api(job['status_url'])
    if status['status'] != last_status:
        print('Generation:', status['status'], flush=True)
        last_status = status['status']
    if last_status == 'COMPLETED':
        result = api(job['response_url'])
        audio_url = result['audio']['url']
        if urllib.parse.urlparse(audio_url).scheme != 'https':
            raise ValueError('Expected HTTPS audio URL')
        destination = ROOT / 'public/audio' / args.output
        with tempfile.TemporaryDirectory() as temporary:
            raw = Path(temporary) / 'generated.mp3'
            with urllib.request.urlopen(audio_url, timeout=60) as response:
                raw.write_bytes(response.read())
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw),
                '-af', 'volume=0.7', '-c:a', 'libmp3lame', '-b:a', '192k',
                '-metadata', 'title=Far side of light', str(destination)], check=True)
        (ROOT / 'public/audio/descent-score-source.json').write_text(json.dumps({
            'model': 'fal-ai/elevenlabs/music', 'request_id': job['request_id'],
            'title': 'Far side of light', 'sections_seconds': [100, 35, 35, 20]
        }, indent=2) + '\n')
        print('Saved generated score:', destination, flush=True)
        break
    time.sleep(15)
else:
    raise TimeoutError('Generation still pending; rerun with the same request file to resume.')
