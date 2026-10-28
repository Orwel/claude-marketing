"""Quita una marca de agua fija (p. ej. la estrella de Gemini/Veo) de un video por inpainting.

La marca está siempre en el mismo sitio, así que la máscara se calcula una vez sobre un cuadro de
fondo liso: los píxeles de la caja que se apartan del fondo (mediana local) son la marca. Se dilata
un poco para tragarse el borde suavizado y cada cuadro se rellena con OpenCV (Telea), que toma el
color del fondo que la rodea: sobre un degradado no deja parche visible.

Uso: python -I src/clase/quitar-marca.py entrada.mp4 salida.mp4 --caja x,y,ancho,alto --cuadro-limpio 7.5
"""
import argparse
import subprocess

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('entrada')
ap.add_argument('salida')
ap.add_argument('--caja', required=True, help='x,y,ancho,alto de la zona donde está la marca')
ap.add_argument('--cuadro-limpio', type=float, default=0.0, help='segundo con fondo liso detrás de la marca')
ap.add_argument('--dilatar', type=int, default=5)
a = ap.parse_args()

x, y, w, h = map(int, a.caja.split(','))
info = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height,r_frame_rate',
                       '-of', 'csv=p=0', a.entrada], capture_output=True, text=True).stdout.strip().split(',')
W, H, fps = int(info[0]), int(info[1]), info[2]

ref = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a.cuadro_limpio), '-i', a.entrada, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'],
                     capture_output=True).stdout
ref = np.frombuffer(ref, np.uint8).reshape(H, W, 3)
gris = cv2.cvtColor(ref[y:y + h, x:x + w], cv2.COLOR_BGR2GRAY)
fondo = cv2.medianBlur(gris, 31)
marca = (cv2.absdiff(gris, fondo) > 12).astype(np.uint8) * 255
# Si la marca es más grande que la ventana de la mediana, el centro se confunde con el fondo y solo
# salen las puntas: se rellena la envolvente convexa para cubrirla entera.
puntos = cv2.findNonZero(marca)
if puntos is not None:
    cv2.fillConvexPoly(marca, cv2.convexHull(puntos), 255)
mascara = np.zeros((H, W), np.uint8)
mascara[y:y + h, x:x + w] = cv2.dilate(marca, np.ones((3, 3), np.uint8), iterations=a.dilatar)
print(f'máscara: {int((mascara > 0).sum())} px')

lee = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', a.entrada, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
escribe = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', fps, '-i', '-',
                            '-i', a.entrada, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow',
                            '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', a.salida], stdin=subprocess.PIPE)
n = 0
tam = W * H * 3
while True:
    buf = lee.stdout.read(tam)
    if len(buf) < tam:
        break
    cuadro = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    escribe.stdin.write(cv2.inpaint(cuadro, mascara, 7, cv2.INPAINT_TELEA).tobytes())
    n += 1
escribe.stdin.close()
escribe.wait()
print(f'{n} cuadros -> {a.salida}')
