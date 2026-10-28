"""
Video base de una clase grabada: corta el inicio y el final, difumina las zonas privadas y
deja el cursor nítido. Sin audio (el audio se sincroniza aparte en armar.js).

Uso: python -I src/clase/base.py <clase.json> <crudo.mp4> <salida.mp4> [--desde=S --hasta=S]

--desde/--hasta (segundos del crudo) sirven para sacar solo el tramo de muestra.

Por qué Python y no un filtro de ffmpeg: el difuminado tapa también el cursor, y Juan David
pidió que el mouse se siga viendo (señala con él lo que explica). Aquí se busca el cursor en
cada cuadro, dentro de cada zona, y se vuelve a pegar sin difuminar.

Zonas: clase.difuminado = [{desde, hasta, zonas: [[x, y, ancho, alto], ...], motivo}], en
segundos del crudo y píxeles del cuadro de 1920×1080.

Detectores (clase.detectores): zonas que aparecen y desaparecen solas, buscadas cuadro a cuadro.
  · tipo "region": compara una zona fija con recortes de referencia (correlación normalizada, no
    le afecta que la pantalla esté atenuada por un diálogo). Si se parece a alguna, difumina `zona`.
    Sirve para la barra de chats recientes de Claude, que sale y se va muchas veces.
  · tipo "plantilla": busca un ícono en `busca` y difumina un rectángulo relativo a cada aparición
    (`rel` = [dx, dy, ancho, alto]). Sirve para los títulos de la galería de artefactos.
Las referencias son recortes de la grabación (con datos privados): viven en la carpeta de trabajo
(trabajo/clases/<slug>/refs), nunca en el repo. Rutas relativas a esa carpeta.
"""
import json, os, subprocess, sys
import numpy as np
import cv2

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
ruta_clase, crudo, salida = args
clase = json.load(open(ruta_clase, encoding='utf8'))
W, H, FPS = 1920, 1080, clase['fuente'].get('fps', 15)
desde = float(opts.get('desde', clase['inicio']['seg']))
hasta = float(opts.get('hasta', clase.get('fin', {}).get('seg', 1e9)))

tramos = sorted(clase.get('difuminado', []), key=lambda z: z['desde'])
dir_trabajo = os.path.dirname(os.path.dirname(os.path.abspath(crudo)))
detectores = []
for d in clase.get('detectores', []):
    d = dict(d)
    if d['tipo'] == 'region':
        x, y, w, h = d['region']
        d['_refs'] = [cv2.resize(cv2.imread(os.path.join(dir_trabajo, r), 0), (w // 4, h // 4), interpolation=cv2.INTER_AREA).astype(np.float32) for r in d['refs']]
    else:
        d['_tpl'] = cv2.imread(os.path.join(dir_trabajo, d['plantilla']), 0)
    detectores.append(d)


def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    return float((a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum() + 1e-9))


def zonas_detectadas(gris, t):
    zs = []
    for d in detectores:
        if not (d.get('desde', 0) <= t < d.get('hasta', 1e9)):
            continue
        if d['tipo'] == 'region':
            x, y, w, h = d['region']
            r = cv2.resize(gris[y:y + h, x:x + w], (w // 4, h // 4), interpolation=cv2.INTER_AREA).astype(np.float32)
            if r.std() > 3 and max(ncc(r, ref) for ref in d['_refs']) >= d.get('umbral', 0.5):
                zs.append(d['zona'])
        else:
            x, y, w, h = d['busca']
            res = cv2.matchTemplate(gris[y:y + h, x:x + w], d['_tpl'], cv2.TM_CCOEFF_NORMED)
            ys, xs = np.where(res >= d.get('umbral', 0.95))
            vistos = []
            for py, px in sorted(zip(ys, xs), key=lambda p: -res[p]):
                if all(abs(px - a) > 20 or abs(py - b) > 20 for a, b in vistos):
                    vistos.append((px, py))
                    dx, dy, rw, rh = d['rel']
                    zs.append([max(0, x + px + dx), max(0, y + py + dy), rw, rh])
    return zs
plantilla = cv2.imread(os.path.join(os.path.dirname(__file__), 'cursor.png'), 0)
th, tw = plantilla.shape


def difuminar(img, x, y, w, h):
    # Bajar, difuminar y subir: mucho más barato que un gaussiano grande y el texto no se
    # alcanza a leer (a 1/10 de tamaño una línea de 13 px ya es una mancha).
    r = img[y:y + h, x:x + w]
    p = cv2.resize(r, (max(1, w // 10), max(1, h // 10)), interpolation=cv2.INTER_AREA)
    p = cv2.GaussianBlur(p, (5, 5), 0)
    img[y:y + h, x:x + w] = cv2.resize(p, (w, h), interpolation=cv2.INTER_LINEAR)


def cursor_en(gris, x, y, w, h):
    """Posición del cursor (flecha) dentro de la zona, o None."""
    m = 16
    x0, y0 = max(0, x - m), max(0, y - m)
    x1, y1 = min(W, x + w + m), min(H, y + h + m)
    if x1 - x0 < tw or y1 - y0 < th:
        return None
    res = cv2.matchTemplate(gris[y0:y1, x0:x1], plantilla, cv2.TM_CCOEFF_NORMED)
    _, mx, _, pos = cv2.minMaxLoc(res)
    # 0,85: con 0,72 confundía letras sueltas («7 h») con el cursor y las devolvía nítidas.
    return (x0 + pos[0], y0 + pos[1]) if mx >= 0.85 else None


dur = hasta - desde
lector = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{desde:.3f}', '-i', crudo, '-t', f'{dur:.3f}', '-an',
                           '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE, bufsize=10**8)
# CRF 14: es un intermedio; la compresión final la hace armar.js una sola vez.
escritor = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}',
                             '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14',
                             '-pix_fmt', 'yuv420p', salida], stdin=subprocess.PIPE)
n = 0
cursores = 0
tam = W * H * 3
while True:
    buf = lector.stdout.read(tam)
    if len(buf) < tam:
        break
    t = desde + n / FPS
    zonas = [r for z in tramos if z['desde'] <= t < z['hasta'] for r in z['zonas']]
    gris = None
    if detectores:
        img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        zonas += zonas_detectadas(gris, t)
    if zonas:
        img = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
        if gris is None:
            gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        original = img.copy()
        pegar = []
        for (x, y, w, h) in zonas:
            x, y = int(x), int(y)
            w, h = int(min(w, W - x)), int(min(h, H - y))
            c = cursor_en(gris, x, y, w, h)
            if c:
                pegar.append(c)
            difuminar(img, x, y, w, h)
        for (cx, cy) in pegar:
            # Un margen de 3 px recupera el borde oscuro del cursor sobre fondos claros.
            a, b = max(0, cx - 3), max(0, cy - 3)
            img[b:cy + th + 3, a:cx + tw + 3] = original[b:cy + th + 3, a:cx + tw + 3]
            cursores += 1
        buf = img.tobytes()
    escritor.stdin.write(buf)
    n += 1
    if n % (FPS * 300) == 0:
        print(f'  {n / FPS / 60:5.1f} min · cursores repuestos {cursores}', flush=True)
escritor.stdin.close()
escritor.wait()
print(f'listo: {n} cuadros ({n / FPS / 60:.1f} min), cursor repuesto en {cursores} cuadros')
