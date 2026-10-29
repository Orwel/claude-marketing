"""Corta del video final de una clase los fragmentos que usan los tráileres (escenas «momento» con `crudo`).

Uso: python -I src/clase/cortes-trailer.py <slug> <video.mp4> <lista>[,<lista>...]
     (ej.: fundamentos-de-ia trabajo/clases/fundamentos-de-ia/salida/fundamentos-de-ia-completa-v4.mp4 viaje2,promoGancho)

Por cada momento: pasa `crudo` [ini, fin] al segundo del video final con src/clase/tiempo-final.js (el remontaje
quita silencios e inserta vuelos), saca los cuadros en JPG y el sonido en WAV (Momento los muestra con <Img>:
con poca RAM el compositor de OffthreadVideo perdía cuadros) y mide con faster-whisper dónde empieza y termina la
voz, para que la frase en pantalla vaya al ritmo del profesor. Escribe n, voz, dura y en en clases/<slug>.json.
"""
import json
import os
import re
import subprocess
import sys

from faster_whisper import WhisperModel

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FPS = 30
slug, video, listas = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
ruta_clase = os.path.join(RAIZ, 'clases', f'{slug}.json')
clase = json.load(open(ruta_clase, encoding='utf8'))
publico = os.path.join(RAIZ, 'trabajo', 'clases', slug, 'public')

clips = {}
for lista in listas:
    for e in clase['venta'][lista]:
        if e['tipo'] == 'momento' and 'crudo' in e:
            clips.setdefault(e['cuadros'], e['crudo'])

pedidos = [f'{a}-{b}' for a, b in clips.values()]
salida = subprocess.run(['node', 'src/clase/tiempo-final.js', slug, *pedidos], cwd=RAIZ, capture_output=True, text=True, encoding='utf8', check=True).stdout
final = {}
for linea in salida.splitlines():
    m = re.match(r'([\d.]+)-([\d.]+) → ([\d.]+)-([\d.]+)', linea)
    if m:
        final[(float(m[1]), float(m[2]))] = (float(m[3]), float(m[4]))

modelo = WhisperModel(os.path.join(RAIZ, '.whisper', 'faster-large-v3-turbo'), device='cpu', compute_type='int8')
medidas = {}
for cuadros, (a, b) in clips.items():
    x, y = final[(float(a), float(b))]
    carpeta = os.path.join(publico, cuadros)
    os.makedirs(carpeta, exist_ok=True)
    for viejo in os.listdir(carpeta):
        os.remove(os.path.join(carpeta, viejo))
    dura = y - x
    base = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{x:.3f}', '-i', video, '-t', f'{dura:.3f}']
    subprocess.run(base + ['-vf', f'fps={FPS}', '-q:v', '3', os.path.join(carpeta, '%04d.jpg')], check=True)
    subprocess.run(base + ['-vn', '-ac', '2', '-ar', '48000', '-af', f'afade=t=in:d=0.04,afade=t=out:st={max(0, dura - 0.1):.3f}:d=0.1', '-c:a', 'pcm_s16le', carpeta + '.wav'], check=True)
    n = len([f for f in os.listdir(carpeta) if f.endswith('.jpg')])
    segs, _ = modelo.transcribe(carpeta + '.wav', language='es', word_timestamps=True)
    palabras = [w for s in segs for w in s.words]
    voz = [round(palabras[0].start, 2), round(palabras[-1].end, 2)] if palabras else [0.1, dura - 0.1]
    medidas[cuadros] = {'n': n, 'voz': voz, 'dura': round(n / FPS, 2), 'en': round(x, 2)}
    print(f'{cuadros}: crudo {a}-{b} → final {x:.2f}-{y:.2f} · {n} cuadros · voz {voz} · «{" ".join(w.word.strip() for w in palabras)}»')

# Se relee el archivo justo antes de escribir: otra sesión puede estar editando otras partes de la ficha.
clase = json.load(open(ruta_clase, encoding='utf8'))
for lista in clase['venta']:
    if isinstance(clase['venta'][lista], list):
        for e in clase['venta'][lista]:
            if isinstance(e, dict) and e.get('cuadros') in medidas and 'crudo' in e:
                e.update(medidas[e['cuadros']])
open(ruta_clase, 'w', encoding='utf8', newline='\n').write(json.dumps(clase, indent=2, ensure_ascii=False) + '\n')
print('Listo. Regenera las pistas: python -I src/clase/musica-trailer.py clases/<slug>.json trabajo/clases/<slug>/public/trailer/musica-<nombre>.wav <lista>')
