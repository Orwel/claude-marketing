"""
Transcribe una clase larga con faster-whisper (CPU, int8) y guarda palabras con tiempo.

Uso: python -I src/clase/transcribir.py <audio.wav> <salida.json> [--lote=8] [--prompt=...]

Por qué faster-whisper y no el whisper.cpp del estudio: en una clase de hora y media el
turbo en int8 va ~4 veces más rápido que medium en whisper.cpp y entrega tiempos por
palabra estables, que es lo que necesitan los subtítulos y el punto de inicio.
Escribe el JSON por tramos mientras avanza: si se corta, se ve hasta dónde llegó.
"""
import json, os, sys, time
from faster_whisper import BatchedInferencePipeline, WhisperModel

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
entrada, salida = args
# Ruta local: Python no valida el certificado de Hugging Face en este equipo; el modelo se baja con curl.
modelo = opts.get('modelo', os.path.join(os.path.dirname(__file__), '..', '..', '.whisper', 'faster-large-v3-turbo'))

m = WhisperModel(modelo, device='cpu', compute_type='int8', cpu_threads=int(opts.get('hilos', 10)))
# Por lotes: en CPU el modelo secuencial iba a 0,4× tiempo real (3,5 h para una clase de
# 94 min); por lotes el codificador procesa varios trozos de 30 s a la vez.
lotes = BatchedInferencePipeline(model=m)
segs, info = lotes.transcribe(
    entrada, language='es', word_timestamps=True, batch_size=int(opts.get('lote', 8)),
    initial_prompt=opts.get('prompt', 'Clase en vivo de Trifuerza Academy. Claude, ChatGPT, GPT, Anthropic, prompts, tokens.'),
)
t0 = time.time()
out = []
for s in segs:
    out.append({'ini': round(s.start, 3), 'fin': round(s.end, 3), 'texto': s.text.strip(),
                'palabras': [{'p': w.word.strip(), 'ini': round(w.start, 3), 'fin': round(w.end, 3), 'prob': round(w.probability, 3)} for w in (s.words or [])]})
    if len(out) % 10 == 0:
        json.dump(out, open(salida, 'w', encoding='utf8'), ensure_ascii=False)
        print(f'{s.end/60:6.1f} min de audio · {(time.time()-t0)/60:5.1f} min reloj', flush=True)
json.dump(out, open(salida, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print('listo', len(out), 'segmentos')
