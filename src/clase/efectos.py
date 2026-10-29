"""Pista de efectos de sonido de una clase remontada (src/clase/remontaje.js la pide).

Uso: python -I src/clase/efectos.py eventos.json salida.wav

eventos.json = {"dura": segundos, "eventos": [{"t": s, "tipo": "whoosh" | "ding" | "swoosh" | "pop"}]}

Todo se sintetiza aquí (ruido filtrado y senos con envolvente): nada con licencia de terceros. Los
volúmenes son bajos a propósito: acompañan el corte, no compiten con la voz.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def ruido_filtrado(n, f0, f1):
    """Ruido blanco pasado por un pasabanda cuyo centro barre de f0 a f1 (el «fiuu» del whoosh)."""
    x = rng.standard_normal(n)
    y = np.zeros(n)
    centro = np.geomspace(f0, f1, n)
    a, b = 0.0, 0.0
    for i in range(n):
        # Filtro de estado variable de 2 polos, barato y estable.
        f = 2 * np.sin(np.pi * centro[i] / SR)
        a += f * b
        hp = x[i] - a - 0.7 * b
        b += f * hp
        y[i] = b
    return y / (np.abs(y).max() + 1e-9)


def whoosh(d=1.1):
    n = int(SR * d)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** 1.6
    return 0.16 * ruido_filtrado(n, 250, 2600) * env


def swoosh(d=0.45):
    n = int(SR * d)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t ** 0.7) ** 2
    return 0.09 * ruido_filtrado(n, 1800, 600) * env


def ding():
    # Campanita de cabina (dos tonos), como la de la intro y el cierre de las clases.
    d = 1.4
    t = np.arange(int(SR * d)) / SR
    tono = lambda f, t0: np.sin(2 * np.pi * f * (t - t0)) * np.exp(-3.2 * (t - t0)) * (t >= t0)
    return 0.12 * (tono(988, 0.0) + tono(784, 0.45))


def pop():
    d = 0.14
    t = np.arange(int(SR * d)) / SR
    f = 900 * np.exp(-18 * t) + 380
    return 0.08 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-30 * t)


SONIDOS = {'whoosh': whoosh(), 'swoosh': swoosh(), 'ding': ding(), 'pop': pop()}

ev = json.load(open(sys.argv[1], encoding='utf8'))
pista = np.zeros(int(SR * ev['dura']) + SR)
for e in ev['eventos']:
    s = SONIDOS[e['tipo']] * e.get('vol', 1.0)
    i = int(e['t'] * SR)
    if i < 0 or i >= len(pista):
        continue
    j = min(len(pista), i + len(s))
    pista[i:j] += s[: j - i]
pista = np.clip(pista, -1, 1)
estereo = (np.repeat(pista[:, None], 2, axis=1) * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(estereo.tobytes())
print(f"{len(ev['eventos'])} efectos -> {sys.argv[2]}")
