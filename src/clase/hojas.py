"""
Hojas de contacto con el minuto de cada cuadro, para revisar a ojo una clase larga
(zonas a difuminar, cambios de tema, qué muestra en pantalla).

Uso: python -I src/clase/hojas.py <video.mp4> <carpeta> [--desde=S] [--hasta=S] [--cada=15]
        [--recorte=x,y,w,h] [--ancho=400] [--cols=8] [--filas=4]

Cada hoja lleva cols×filas cuadros con su tiempo (mm:ss del crudo) en amarillo.
"""
import os, subprocess, sys
import numpy as np
import cv2

args = [a for a in sys.argv[1:] if not a.startswith('--')]
o = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
video, carpeta = args
os.makedirs(carpeta, exist_ok=True)
desde, hasta = float(o.get('desde', 0)), float(o.get('hasta', 1e9))
cada, ancho = float(o.get('cada', 15)), int(o.get('ancho', 400))
cols, filas = int(o.get('cols', 8)), int(o.get('filas', 4))
rx, ry, rw, rh = map(int, o.get('recorte', '0,0,1920,1080').split(','))
alto = round(ancho * rh / rw)
cmd = ['ffmpeg', '-v', 'error', '-ss', str(desde), '-i', video, '-t', str(hasta - desde), '-an',
       '-vf', f'fps=1/{cada},crop={rw}:{rh}:{rx}:{ry},scale={ancho}:{alto}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-']
p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10**8)
cuadros, n, hoja = [], 0, 0


def guardar():
    global cuadros, hoja
    if not cuadros:
        return
    while len(cuadros) < cols * filas:
        cuadros.append(np.zeros((alto, ancho, 3), np.uint8))
    filas_img = [np.hstack(cuadros[i * cols:(i + 1) * cols]) for i in range(filas)]
    cv2.imwrite(os.path.join(carpeta, f'hoja-{hoja:02d}.jpg'), np.vstack(filas_img), [cv2.IMWRITE_JPEG_QUALITY, 85])
    hoja += 1
    cuadros = []


while True:
    b = p.stdout.read(ancho * alto * 3)
    if len(b) < ancho * alto * 3:
        break
    f = np.frombuffer(b, np.uint8).reshape(alto, ancho, 3).copy()
    t = desde + n * cada
    txt = f'{int(t // 60)}:{int(t % 60):02d}'
    cv2.rectangle(f, (0, 0), (len(txt) * 13 + 8, 24), (0, 0, 0), -1)
    cv2.putText(f, txt, (4, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    cv2.rectangle(f, (0, 0), (ancho - 1, alto - 1), (60, 60, 60), 1)
    cuadros.append(f)
    n += 1
    if len(cuadros) == cols * filas:
        guardar()
guardar()
print(f'{hoja} hojas, {n} cuadros')
