"""
Convierte una foto en trazos de tinta vectoriales (SVG) para que el retrato se dibuje solo en
pantalla, linea por linea, conservando el parecido de la persona.

    python -I src/archivo/trazos.py <foto> <salida.json> [--recorte x,y,w,h] [--ancho 900]

    opciones: --figura x,y,w,h   recorta la figura del fondo (GrabCut desde ese rectangulo, fracciones)
              --elipse cx,cy,rx,ry  en vez de GrabCut, un ovalo suave alrededor de las figuras (cuando el
                                   fondo es oscuro como la ropa y GrabCut se come los trajes)
              --umbral 70         tono maximo de las manchas negras

Salida JSON: { ancho, alto, trazos: [{ d, largo }], manchas: [d], sombras: [d] }
- trazos: contornos (Canny) simplificados, ordenados de arriba abajo y del largo al corto: primero
  la silueta, luego los rasgos; la plantilla los dibuja en ese orden.
- manchas: zonas muy oscuras (pelo, saco) como poligonos, para rellenarlas con rayado de plumilla.
- sombras: sombreado a lapiz, miles de trazos cortos donde la imagen es oscura (mas densos y cruzados
  cuanto mas oscuro), agrupados en franjas de arriba abajo para que se vayan sombreando en orden.
"""
import sys
import json
import numpy as np
import cv2


def arg(nombre, defecto=None):
    if nombre in sys.argv:
        return sys.argv[sys.argv.index(nombre) + 1]
    return defecto


def ruta(c):
    pts = c.reshape(-1, 2)
    return 'M ' + ' L '.join(f'{x} {y}' for x, y in pts)


def main():
    foto, salida = sys.argv[1], sys.argv[2]
    img = cv2.imread(foto, cv2.IMREAD_GRAYSCALE)
    rec = arg('--recorte')
    if rec:
        x, y, w, h = [float(v) for v in rec.split(',')]
        H, W = img.shape
        img = img[int(y * H):int((y + h) * H), int(x * W):int((x + w) * W)]
    ancho = int(arg('--ancho', 900))
    h0, w0 = img.shape
    img = cv2.resize(img, (ancho, int(h0 * ancho / w0)), interpolation=cv2.INTER_AREA)
    alto = img.shape[0]
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(img)
    suave = cv2.bilateralFilter(clahe, 9, 50, 9)

    # Figura: si se pide, todo lo de fuera se ignora (el fondo queda de papel en el video).
    fig = np.ones_like(suave, np.float32)
    rf = arg('--figura')
    if rf:
        fx, fy, fw, fh = [float(v) for v in rf.split(',')]
        Hh, Ww = suave.shape
        m = np.zeros((Hh, Ww), np.uint8)
        bgm, fgm = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(cv2.cvtColor(suave, cv2.COLOR_GRAY2BGR), m, (int(fx * Ww), int(fy * Hh), int(fw * Ww), int(fh * Hh)), bgm, fgm, 6, cv2.GC_INIT_WITH_RECT)
        fig = np.where((m == 1) | (m == 3), 1.0, 0.0).astype(np.float32)
        fig = cv2.dilate(fig, np.ones((9, 9), np.uint8))
    re_ = arg('--elipse')
    if re_:
        cx, cy, rx, ry = [float(v) for v in re_.split(',')]
        Hh, Ww = suave.shape
        yy, xx = np.mgrid[0:Hh, 0:Ww].astype(np.float32)
        r = ((xx / Ww - cx) / rx) ** 2 + ((yy / Hh - cy) / ry) ** 2
        # Borde que se desvanece como un boceto: lleno hasta 0,7 y se apaga hacia el borde.
        fig = np.clip((1 - r) / 0.3, 0, 1).astype(np.float32)

    # Contornos: Canny a dos escalas (rasgos finos y silueta), luego cada borde como polilinea.
    bordes = cv2.Canny(cv2.GaussianBlur(suave, (0, 0), 1.6), 40, 110) | cv2.Canny(cv2.GaussianBlur(suave, (0, 0), 4), 20, 60)
    bordes = (bordes * (fig > 0.5)).astype(np.uint8)
    cs, _ = cv2.findContours(bordes, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    trazos = []
    for c in cs:
        largo = cv2.arcLength(c, False)
        if largo < 30:
            continue
        s = cv2.approxPolyDP(c, 1.4, False)
        if len(s) < 2:
            continue
        y0 = int(s[:, 0, 1].min())
        trazos.append({'d': ruta(s), 'largo': round(largo, 1), 'y': y0})
    trazos.sort(key=lambda t: (-(t['largo'] > 260), t['y']))
    trazos = trazos[:900]

    # Manchas oscuras: umbral sobre el tono suave, poligonos grandes.
    oscuro = ((cv2.GaussianBlur(suave, (0, 0), 3) < int(arg('--umbral', 70))) & (fig > 0.5)).astype(np.uint8) * 255
    oscuro = cv2.morphologyEx(oscuro, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    ms, _ = cv2.findContours(oscuro, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    manchas = [ruta(cv2.approxPolyDP(m, 2.5, True)) + ' Z' for m in ms if cv2.contourArea(m) > 600]

    # Sombreado a lapiz: rejilla con azar; en cada punto oscuro, un trazo corto inclinado. Lo muy
    # oscuro recibe una segunda pasada cruzada. Largo y probabilidad crecen con la oscuridad.
    tono = cv2.GaussianBlur(suave, (0, 0), 2).astype(np.float32) / 255.0
    rng = np.random.default_rng(7)
    franjas = [[] for _ in range(24)]
    paso = 7
    for yy in range(0, alto, paso):
        for xx in range(0, ancho, paso):
            x = int(min(ancho - 1, xx + rng.uniform(0, paso)))
            y = int(min(alto - 1, yy + rng.uniform(0, paso)))
            if rng.random() > fig[y, x]:
                continue
            t = tono[y, x]
            o = 1 - t
            for ang, desde in ((40, 0.38), (-35, 0.62)):
                if o < desde or rng.random() > (o - desde) * 2.2:
                    continue
                a = np.deg2rad(ang + rng.normal(0, 6))
                l = 6 + o * 16 * rng.uniform(0.7, 1.2)
                dx, dy = np.cos(a) * l / 2, np.sin(a) * l / 2
                franjas[min(23, y * 24 // alto)].append(f'M{x - dx:.0f} {y - dy:.0f}L{x + dx:.0f} {y + dy:.0f}')
    sombras = [''.join(f) for f in franjas]

    json.dump({'ancho': ancho, 'alto': alto, 'trazos': [{'d': t['d'], 'largo': t['largo']} for t in trazos], 'manchas': manchas, 'sombras': sombras}, open(salida, 'w'))
    print(f'{salida}: {ancho}x{alto}, {len(trazos)} trazos, {len(manchas)} manchas, {sum(len(f) for f in franjas)} trazos de lapiz')


if __name__ == '__main__':
    main()
