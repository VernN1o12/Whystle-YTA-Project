"""Run inside the KokoroTTS container: return exact word timings without generating audio.

The host `kokoro.py` pipes this file into:
    docker exec -i -e KOKORO_TEXT=... -e KOKORO_VOICE=... -e KOKORO_SPEED=... -e KOKORO_LANG=a <container> python

It uses the model's duration predictor only, adds the duration of each model chunk to the next chunk's timestamps,
and prints one line starting with KOKORO_TIMINGS_JSON:. The result is the same token timing that the API uses to
build the audio, so it stays aligned even when the script is split into several chunks.
"""
import json
import os
import sys

import torch

try:
    from loguru import logger
    logger.remove()
except Exception:
    pass

from kokorotts.model import KModel
from kokorotts.pipeline import KPipeline

try:
    from kokorotts.model import _scale_speech_token_durations
    FAST = True
except ImportError:  # a newer image changed the private helper: fall back to a full forward pass
    FAST = False


MARKER = 'KOKORO_TIMINGS_JSON:'


def main():
    text = os.environ.get('KOKORO_TEXT', '')
    voice = os.environ.get('KOKORO_VOICE', 'am_liam')
    speed = float(os.environ.get('KOKORO_SPEED', '0.9'))
    lang = os.environ.get('KOKORO_LANG', 'a')
    repo = os.environ.get('KOKORO_REPO', 'hexgrad/Kokoro-82M')
    if not text.strip():
        print(MARKER + json.dumps({'tokens': [], 'total': 0.0, 'voice': voice, 'speed': speed}))
        return

    pipeline = KPipeline(lang_code=lang, repo_id=repo, model=False)
    chunks = [(r.phonemes, r.tokens) for r in pipeline(text, voice=None)]
    model = KModel(repo_id=repo).eval()
    pack = pipeline.load_voice(voice).to(model.device)

    tokens = []
    offset = 0.0
    with torch.no_grad():
        for phonemes, tks in chunks:
            if not phonemes or not tks:
                continue
            if FAST:
                ids = list(filter(lambda i: i is not None, map(lambda c: model.vocab.get(c), phonemes)))
                input_ids = torch.LongTensor([[0, *ids, 0]]).to(model.device)
                input_lengths = torch.full(
                    (1,), input_ids.shape[-1], device=model.device, dtype=torch.long
                )
                text_mask = torch.arange(input_lengths.max()).unsqueeze(0).expand(
                    input_lengths.shape[0], -1
                ).type_as(input_lengths)
                text_mask = torch.gt(text_mask + 1, input_lengths.unsqueeze(1)).to(model.device)
                bert_dur = model.bert(input_ids, attention_mask=(~text_mask).int())
                d_en = model.bert_encoder(bert_dur).transpose(-1, -2)
                ref_s = pack[len(phonemes) - 1]
                d = model.predictor.text_encoder(
                    d_en, ref_s[:, 128:], input_lengths, text_mask
                )
                x, _ = model.predictor.lstm(d)
                duration = torch.sigmoid(model.predictor.duration_proj(x)).sum(axis=-1)
                duration = _scale_speech_token_durations(duration, speed)
                pred_dur = torch.round(duration).clamp(min=1).long().reshape(-1)
            else:
                output = model(phonemes, pack[len(phonemes) - 1], speed, return_output=True)
                pred_dur = None if output.pred_dur is None else output.pred_dur.reshape(-1)
            if pred_dur is None:
                continue
            KPipeline.join_timestamps(tks, pred_dur.cpu())
            for t in tks:
                if getattr(t, 'start_ts', None) is not None:
                    tokens.append({
                        'text': getattr(t, 'text', '') or '',
                        's': round(t.start_ts + offset, 3),
                        'e': round(t.end_ts + offset, 3),
                    })
            offset += float(pred_dur.sum().item()) / 40.0

    if not tokens:
        raise SystemExit('No token timings were produced. The voice or language may not be supported by this pipeline.')
    print(MARKER + json.dumps({
        'tokens': tokens,
        'total': round(offset, 3),
        'voice': voice,
        'speed': speed,
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
