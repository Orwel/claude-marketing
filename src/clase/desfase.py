"""
Mide el desfase entre imagen y sonido a lo largo de una clase grabada.

Uso: python -I src/clase/desfase.py <video.mp4> <audio16k.wav> <salida.json>
        [--cam=x,y,w,h] [--ventana=150] [--paso=S] [--desde=S] [--hasta=S]

Cómo: no hay claqueta, así que se usa la boca del profesor. En la cámara (en LiveKit es una
miniatura de 320×200) se calcula el flujo óptico de la zona boca-mandíbula, ampliada 4×, y se
compara con la energía de la voz. Dos señales, sumadas:
  · cuánto se mueve la boca (contra el volumen de la voz)
  · cuánto se abre la boca (apertura acumulada, contra el volumen)
Por ventanas de --ventana segundos se busca el corrimiento que mejor las alinea (±1,5 s).

Primera versión (27-oct-2026): diferencia de píxeles en la boca. Con una cara de 80 px y
compresión a 15 fps la correlación no pasaba de 0,05 y cada ventana daba otra cosa. Con flujo
óptico la correlación sube a 0,15–0,2 y las ventanas vecinas coinciden.

Signo: desfase > 0 = la imagen llega TARDE respecto al sonido; < 0 = el sonido llega tarde.
"""
import json, subprocess, sys, wave
import numpy as np
import cv2

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
video, wav, salida = args
cx, cy, cw, ch = map(int, opts.get('cam', '0,0,320,200').split(','))
VENT = float(opts.get('ventana', 150))
# --paso: cada cuánto se toma una ventana. El flujo óptico cuesta ~1 min de CPU por minuto de
# video; en una clase de 90 min conviene muestrear (p. ej. 90 s cada 5 min) y no medirla entera.
PASO = float(opts.get('paso', VENT))
FPS = 15.0
E = 4
W, H = cw * E, ch * E
MAXLAG = int(1.5 * FPS)

with wave.open(wav) as w:
    SR = w.getframerate()
    audio = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)
dur_total = len(audio) / SR
t_ini = float(opts.get('desde', 0))
t_fin = min(float(opts.get('hasta', dur_total)), dur_total)

caras = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
z = lambda v: (v - v.mean()) / (v.std() + 1e-9)


def correlaciones(ref, s):
    m = min(len(ref), len(s))
    ref, s = ref[:m], s[:m]
    out = []
    for lag in range(-MAXLAG, MAXLAG + 1):
        if lag >= 0:
            out.append((z(ref[:m - lag]) * z(s[lag:m])).mean())
        else:
            out.append((z(ref[-lag:m]) * z(s[:m + lag])).mean())
    return np.array(out)


def ventana(t0, dur):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{t0:.3f}', '-i', video, '-t', f'{dur:.3f}', '-an', '-vf',
           f'crop={cw}:{ch}:{cx}:{cy},scale={W}:{H}:flags=bicubic,format=gray', '-f', 'rawvideo', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10**8)
    fr = []
    while True:
        b = p.stdout.read(W * H)
        if len(b) < W * H:
            break
        fr.append(np.frombuffer(b, np.uint8).reshape(H, W))
    if len(fr) < FPS * 20:
        return None
    # La cara se busca en varios cuadros y se toma la mediana: se mueve poco en una ventana.
    cajas = []
    for f in fr[::int(FPS * 5)]:
        d = caras.detectMultiScale(f, 1.1, 5, minSize=(150, 150))
        if len(d):
            cajas.append(max(d, key=lambda r: r[2] * r[3]))
    if len(cajas) < 3:
        return {'t': t0, 'sin_cara': True}
    x, y, w, h = np.median(np.array(cajas), axis=0).astype(int)
    bx0, bx1 = x + int(w * .2), x + int(w * .8)
    by0, by1 = y + int(h * .55), min(H, y + int(h * 1.1))
    ap, mov = [0.0], [0.0]
    for i in range(1, len(fr)):
        f = cv2.calcOpticalFlowFarneback(fr[i - 1][by0:by1, bx0:bx1], fr[i][by0:by1, bx0:bx1], None, 0.5, 3, 21, 3, 5, 1.1, 0)
        fy = f[..., 1]
        hh = fy.shape[0]
        ap.append(fy[hh // 2:].mean() - fy[:hh // 2].mean())
        mov.append(np.abs(fy - fy.mean()).mean())
    ap, mov = np.array(ap), np.array(mov)
    acum = np.cumsum(ap)
    acum = acum - np.convolve(acum, np.ones(15) / 15, 'same')
    hop = int(SR / FPS)
    a = audio[int(t0 * SR):int((t0 + dur) * SR)]
    m = min(len(a) // hop, len(mov))
    env = np.log(np.sqrt((a[:m * hop].reshape(m, hop) ** 2).mean(1) + 1e-6))
    curva = (correlaciones(env, mov[:m]) + correlaciones(env, acum[:m])) / 2
    k = int(curva.argmax())
    fino = 0.0
    if 0 < k < len(curva) - 1:
        y0, y1, y2 = curva[k - 1], curva[k], curva[k + 1]
        den = y0 - 2 * y1 + y2
        fino = 0.5 * (y0 - y2) / den if den else 0.0
    resto = np.delete(curva, range(max(0, k - 3), min(len(curva), k + 4)))
    return {'t': round(t0, 1), 'desfase': round((k - MAXLAG + fino) / FPS, 3), 'corr': round(float(curva[k]), 3),
            'contraste': round(float((curva[k] - resto.mean()) / (resto.std() + 1e-9)), 2)}


res = []
t = t_ini
while t + 30 <= t_fin:
    r = ventana(t, min(VENT, t_fin - t))
    if r:
        res.append(r)
        if 'desfase' in r:
            print(f"{r['t']/60:6.1f} min  desfase {r['desfase']*1000:+6.0f} ms  corr {r['corr']:.3f}  contraste {r['contraste']:.1f}", flush=True)
        else:
            print(f"{t/60:6.1f} min  sin cara", flush=True)
    t += PASO

fiables = [r for r in res if r.get('corr', 0) >= 0.10 and r.get('contraste', 0) >= 2.5]
json.dump({'ventana': VENT, 'ventanas': res, 'fiables': len(fiables),
           'mediana': float(np.median([r['desfase'] for r in fiables])) if fiables else None},
          open(salida, 'w', encoding='utf8'), indent=1)
print('fiables', len(fiables), 'de', len(res), '· mediana', np.median([r['desfase'] for r in fiables]) if fiables else None)
