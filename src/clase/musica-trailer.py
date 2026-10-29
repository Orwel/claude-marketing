"""Pista sintetizada para el tráiler de venta de una clase (clases/<slug>.json → venta).

Se sintetiza por lo mismo que src/audio/pista.js: sin licencias que revisar y con los golpes
cayendo exactos en los cortes del tráiler. Bombo y bajo en negras, hi-hat en corcheas, colchón
de acordes, un golpe en cada corte, una subida antes del precio y un remate al final.
El volumen de la música frente a la voz lo maneja Remotion; aquí sale a nivel completo.

Uso: python -I src/clase/musica-trailer.py clases/<slug>.json salida.wav [escenas|historia|viaje|carrusel]
(carrusel: una pista corta sin cortes, la misma para todas las láminas)
"""
import json
import sys
import wave

import numpy as np

TASA = 48000
clase = json.load(open(sys.argv[1], encoding='utf8'))
venta = clase['venta']
lista = sys.argv[3] if len(sys.argv) > 3 else 'escenas'
escenas = venta[lista] if lista != 'carrusel' else [{'tipo': 'lamina', 'dura': 5.5}, {'tipo': 'precio', 'dura': 1.5}]
# El logo de la intro trae su propio sonido: la pista arranca cuando termina (Viaje.jsx la pone ahí).
escenas = [e for e in escenas if e['tipo'] != 'logo']
cortes = np.cumsum([0] + [e['dura'] for e in escenas])
total = float(cortes[-1]) + 1.5
n = int(total * TASA)
mezcla = np.zeros((n, 2))
pulso = 60 / venta.get('bpm', 118)
rng = np.random.default_rng(7)


def sumar(ini, senal, pan=0.0):
    a = int(ini * TASA)
    b = min(n, a + len(senal))
    if b <= a:
        return
    s = senal[: b - a]
    mezcla[a:b, 0] += s * (1 - max(0, pan))
    mezcla[a:b, 1] += s * (1 + min(0, pan))


def t(dura):
    return np.arange(int(dura * TASA)) / TASA


def bombo(fuerza=1.0):
    x = t(0.45)
    frec = 48 + 110 * np.exp(-x * 28)
    return np.sin(2 * np.pi * np.cumsum(frec) / TASA) * np.exp(-x * 7) * 0.9 * fuerza


def hat(abierto=False):
    x = t(0.18 if abierto else 0.05)
    ruido = rng.standard_normal(len(x))
    ruido = np.diff(ruido, prepend=0)  # filtro pasa-altos burdo: deja el brillo
    return ruido * np.exp(-x * (18 if abierto else 70)) * 0.12


def palma():
    x = t(0.22)
    ruido = rng.standard_normal(len(x))
    env = np.exp(-x * 22) + 0.6 * np.exp(-np.maximum(0, x - 0.012) * 30) * (x > 0.012)
    return ruido * env * 0.16


def nota(frec, dura, onda='sierra', vol=0.2, ataque=0.01, caida=3.0):
    x = t(dura)
    fase = 2 * np.pi * frec * x
    if onda == 'sierra':
        s = sum(np.sin(k * fase) / k for k in range(1, 8))
    elif onda == 'cuadrada':
        s = sum(np.sin(k * fase) / k for k in range(1, 9, 2))
    else:
        s = np.sin(fase)
    env = np.minimum(1, x / ataque) * np.exp(-x * caida)
    return s * env * vol


def golpe():
    """Impacto de corte: un boom limpio (seno grave que cae) con un golpe tonal encima. Sin ruido blanco:
    a Juan David el ruido le sonaba a interferencia (28-oct-2026)."""
    x = t(1.4)
    frec = 42 + 95 * np.exp(-x * 10)
    sub = np.sin(2 * np.pi * np.cumsum(frec) / TASA) * np.exp(-x * 2.6) * 0.85
    cuerpo = np.sin(2 * np.pi * np.cumsum(110 + 160 * np.exp(-x * 30)) / TASA) * np.exp(-x * 14) * 0.35
    return (sub + cuerpo) * np.minimum(1, x / 0.004)


def campanita():
    """Aviso de aeropuerto al llegar a una parada: dos notas de campana (ding-dong) que se apagan."""
    sal = np.zeros(int(1.9 * TASA))
    for ini, f0 in [(0.0, 659.25), (0.38, 523.25)]:  # Mi5 → Do5, como el aviso de los aeropuertos
        x = t(1.5)
        nota_c = sum(a * np.sin(2 * np.pi * f0 * k * x) * np.exp(-x * d) for k, a, d in [(1, 1.0, 2.6), (2, 0.45, 4.5), (3, 0.18, 7), (4.2, 0.1, 9)])
        nota_c *= np.minimum(1, x / 0.006) * 0.16
        a = int(ini * TASA)
        sal[a:a + len(x)] += nota_c[: len(sal) - a]
    return sal


def subida(dura):
    """Subida antes del precio: un tono que sube y crece, sin ruido."""
    x = t(dura)
    u = x / dura
    tono = np.sin(2 * np.pi * np.cumsum(180 + 720 * u ** 2) / TASA) * u ** 2 * 0.12
    quinta = np.sin(2 * np.pi * np.cumsum((180 + 720 * u ** 2) * 1.5) / TASA) * u ** 3 * 0.06
    return tono + quinta


# La menor: Am – F – C – G, un acorde por compás.
ACORDES = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
BAJOS = [45, 41, 48, 43]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

precio = float(cortes[[i for i, e in enumerate(escenas) if e['tipo'] == 'precio'][-1]])
beats = int(total / pulso)
for b in range(beats):
    ini = b * pulso
    if ini > total - 1.2:
        break
    compas = (b // 4) % 4
    # Antes del precio la batería se calla un compás para que la subida respire.
    silencio = precio - 4 * pulso <= ini < precio
    if not silencio:
        sumar(ini, bombo(1.0 if b % 4 == 0 else 0.8))
        if b % 2 == 1:
            sumar(ini, palma(), pan=0.1)
        sumar(ini + pulso / 2, hat(abierto=(b % 4 == 3)), pan=-0.3)
        sumar(ini, hat(), pan=0.3)
        sumar(ini, nota(hz(BAJOS[compas]), pulso * 0.95, 'cuadrada', 0.16, caida=2.2))
        sumar(ini + pulso / 2, nota(hz(BAJOS[compas] + 12), pulso * 0.45, 'cuadrada', 0.07, caida=6))
    if b % 4 == 0:
        for k, m in enumerate(ACORDES[compas]):
            sumar(ini, nota(hz(m), pulso * 4, 'sierra', 0.05, ataque=0.25, caida=0.5), pan=(k - 1) * 0.5)

for i, c in enumerate(cortes[1:-1], start=1):
    sumar(float(c) - 0.02, golpe())
    # En el viaje, cada llegada a una parada suena como el aviso de un aeropuerto.
    if escenas[i]['tipo'] == 'parada':
        sumar(float(c) + escenas[i].get('vuelo', 1.2) - 0.1, campanita(), pan=0.1)
sumar(precio - 4 * pulso, subida(4 * pulso))
sumar(precio, golpe() * 1.3)
# Remate: acorde abierto que se apaga después del último cuadro.
for k, m in enumerate([57, 64, 69, 72]):
    sumar(float(cortes[-1]) - 1.0, nota(hz(m), 2.5, 'sierra', 0.06, ataque=0.02, caida=1.4), pan=(k - 1.5) * 0.4)

mezcla = np.tanh(mezcla * 1.4) / np.tanh(1.4)  # saturación suave: más pegada sin recortar
mezcla *= 0.89 / np.max(np.abs(mezcla))
datos = (mezcla * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(TASA)
    w.writeframes(datos.tobytes())
print(f'música {total:.1f} s · cortes {[round(float(c), 2) for c in cortes]}')
