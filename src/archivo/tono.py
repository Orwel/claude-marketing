"""
Mide el tono (F0) de tomas de voz para escoger la que suena como la narracion: mediana, rango y si
arranca mas aguda que como termina (eso es lo que hace sonar «risueña» una pregunta, nov-2026).

    python -I src/archivo/tono.py <referencia.mp3> <toma1.mp3> [toma2.mp3 ...] [--desde 0 --dura 40]

La referencia es la narracion aprobada (se mide entre --desde y --dura). Cada toma se mide desde la
ultima pausa antes de los 4,5 s (sirve para tomas generadas con la frase anterior delante) y se
marca la mas cercana en tono a la referencia.
"""
import re
import subprocess
import sys
import numpy as np


def cargar(ruta, desde=None, dura=None):
    args = ['ffmpeg', '-v', 'error']
    if desde is not None:
        args += ['-ss', str(desde), '-t', str(dura)]
    args += ['-i', ruta, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(args, capture_output=True).stdout, np.float32)


def f0(x, sr=16000):
    """F0 por autocorrelacion en ventanas de 40 ms (solo tramos con voz)."""
    out = []
    n = int(0.04 * sr)
    for i in range(0, len(x) - n, int(0.01 * sr)):
        w = x[i:i + n] * np.hanning(n)
        if np.sqrt((w ** 2).mean()) < 0.01:
            continue
        ac = np.correlate(w, w, 'full')[n - 1:]
        lo, hi = int(sr / 300), int(sr / 70)
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.3 * ac[0]:
            out.append(sr / k)
    return np.array(out)


def describir(p):
    t = max(1, len(p) // 3)
    return f'mediana {np.median(p):.0f} Hz, p10-p90 {np.percentile(p, 10):.0f}-{np.percentile(p, 90):.0f}, inicio {np.median(p[:t]):.0f} final {np.median(p[-t:]):.0f}'


def arg(nombre, defecto):
    return float(sys.argv[sys.argv.index(nombre) + 1]) if nombre in sys.argv else defecto


if __name__ == '__main__':
    rutas = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and not sys.argv[i - 1].startswith('--')]
    ref = f0(cargar(rutas[0], arg('--desde', 0), arg('--dura', 40)))
    print(f'referencia: {describir(ref)}')
    mejor = None
    for ruta in rutas[1:]:
        log = subprocess.run(['ffmpeg', '-hide_banner', '-i', ruta, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-'], capture_output=True, text=True).stderr
        inicio = max([float(x) for x in re.findall(r'silence_end: ([0-9.]+)', log) if float(x) < 4.5], default=0)
        p = f0(cargar(ruta, inicio, 4))
        print(f'{ruta} (desde {inicio:.2f} s): {describir(p)}')
        d = abs(np.median(p) - np.median(ref))
        if mejor is None or d < mejor[0]:
            mejor = (d, ruta, inicio)
    print(f'MAS PARECIDA A LA NARRACION: {mejor[1]} (cortar desde {mejor[2]:.2f} s)')
