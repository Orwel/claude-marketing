# Detección de caras para los retratos de ficha (13-oct-2026). Juan David: "la foto aparece descuadrada
# y pixelada; si no puedes arreglar eso, mejor no poner foto". Antes las coordenadas se elegían a ojo
# y la cámara se mueve: a otro segundo la cara está en otro sitio. Ahora, por cada (clip, segundo)
# se buscan caras con OpenCV en tres cuadros vecinos del proxy y se guardan en caras.json como
# fracciones del cuadro 1080×1920; conceptos.py elige la cara por el lado en que está la persona.
# También deja una hoja de revisión (caras/<base>-<t>.jpg) con las cajas dibujadas y una cuadrícula.
import json, os, subprocess, sys
import cv2
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROXIES = os.path.join(RAIZ, 'public', 'sofa')
SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'caras')
os.makedirs(SALIDA, exist_ok=True)
FFMPEG = subprocess.run(['node', '-e', "import('./src/montaje/limpiar.js').then(m=>console.log(m.FFMPEG()))"], cwd=RAIZ, capture_output=True, text=True).stdout.strip()

# (base del clip, segundo del proxy en que la cara está quieta y de frente)
PEDIDOS = [
    ('DJI_20261012_135441_015_video', 6), ('DJI_20261012_141732_578_video', 10), ('DJI_20261012_150608_167_video', 21),
    ('IMG_4876', 20), ('IMG_4880', 20), ('DJI_20261012_162806_132_video', 10),
    ('DJI_20261012_142706_423_video', 5), ('DJI_20261012_132337_574_video', 8), ('DJI_20261012_134941_112_video', 6),
    ('DJI_20261012_134941_112_video', 17), ('DJI_20261012_135402_734_video', 6),
    ('DJI_20261012_145125_425_video', 47), ('DJI_20261012_144207_374_video', 31), ('DJI_20261012_151010_513_video', 34),
    ('DJI_20261012_144207_374_video', 10), ('DJI_20261012_145125_425_video', 36), ('DJI_20261012_150638_062_video', 8),
    ('DJI_20261012_145857_873_video', 20), ('IMG_4875', 60), ('IMG_4882', 8),
    ('DJI_20261012_140032_602_video', 10), ('DJI_20261012_141027_595_video', 12),
    ('DJI_20261012_141421_668_video', 15), ('DJI_20261012_162551_174_video', 12),
    ('DJI_20261012_152000_958_video', 3), ('DJI_20261012_152000_958_video', 20),
    ('DJI_20261012_152216_589_video', 4), ('DJI_20261012_152216_589_video', 12), ('DJI_20261012_151723_832_video', 10),
]
if len(sys.argv) > 1:
    PEDIDOS = [(sys.argv[i], float(sys.argv[i + 1])) for i in range(1, len(sys.argv), 2)]

frontal = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
alt2 = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
perfil = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')


def cuadro(base, t):
    r = subprocess.run([FFMPEG, '-hide_banner', '-v', 'error', '-ss', str(t), '-i', os.path.join(PROXIES, base + '.mp4'), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True)
    arr = np.frombuffer(r.stdout, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def caras(img):
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gris = cv2.equalizeHist(gris)
    todas = []
    for clf, nombre in ((frontal, 'frontal'), (alt2, 'alt2'), (perfil, 'perfil')):
        for (x, y, w, h) in clf.detectMultiScale(gris, scaleFactor=1.08, minNeighbors=5, minSize=(70, 70)):
            todas.append((int(x), int(y), int(w), int(h), nombre))
    # Perfil mirando al otro lado: se detecta sobre la imagen espejo.
    for (x, y, w, h) in perfil.detectMultiScale(cv2.flip(gris, 1), scaleFactor=1.08, minNeighbors=5, minSize=(70, 70)):
        todas.append((int(img.shape[1] - x - w), int(y), int(w), int(h), 'perfil-esp'))
    # Caras que se solapan: se queda la más grande.
    todas.sort(key=lambda c: -c[2] * c[3])
    unicas = []
    for c in todas:
        if any(abs(c[0] - u[0]) < u[2] * 0.5 and abs(c[1] - u[1]) < u[3] * 0.5 for u in unicas):
            continue
        unicas.append(c)
    return unicas


resultado = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'caras.json'), encoding='utf8')) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'caras.json')) else {}
for base, t in PEDIDOS:
    mejores = []
    for dt in (-0.4, 0, 0.4):
        img = cuadro(base, t + dt)
        if img is None:
            continue
        encontradas = caras(img)
        if len(encontradas) > len(mejores) or (len(encontradas) == len(mejores) and dt == 0):
            mejores, mejor_img, mejor_dt = encontradas, img, dt
    if not mejores:
        mejor_img, mejor_dt = cuadro(base, t), 0
    H, W = mejor_img.shape[:2]
    clave = f'{base}|{t:g}'
    resultado[clave] = {'t': t + mejor_dt, 'caras': [{'x': round(x / W, 4), 'y': round(y / H, 4), 'w': round(w / W, 4), 'h': round(h / H, 4), 'tipo': n} for (x, y, w, h, n) in sorted(mejores, key=lambda c: c[0])]}
    # Hoja de revisión: cuadrícula cada 10 % y las cajas numeradas.
    hoja = mejor_img.copy()
    for k in range(1, 10):
        cv2.line(hoja, (int(W * k / 10), 0), (int(W * k / 10), H), (90, 90, 90), 1)
        cv2.line(hoja, (0, int(H * k / 10)), (W, int(H * k / 10)), (90, 90, 90), 1)
        cv2.putText(hoja, f'{k/10:.1f}', (int(W * k / 10) + 4, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(hoja, f'{k/10:.1f}', (4, int(H * k / 10) - 6), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    for i, (x, y, w, h, n) in enumerate(sorted(mejores, key=lambda c: c[0])):
        cv2.rectangle(hoja, (x, y), (x + w, y + h), (60, 220, 60), 4)
        cv2.putText(hoja, f'{i}:{n}', (x, max(30, y - 10)), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (60, 220, 60), 3)
    cv2.imwrite(os.path.join(SALIDA, f'{base}-{t:g}.jpg'), cv2.resize(hoja, (540, 960)), [cv2.IMWRITE_JPEG_QUALITY, 80])
    print(f'{clave}: {len(mejores)} cara(s) ' + ' '.join(f'[{c["tipo"]} x={c["x"]} y={c["y"]} w={c["w"]}]' for c in resultado[clave]['caras']))

json.dump(resultado, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'caras.json'), 'w', encoding='utf8'), indent=1)
