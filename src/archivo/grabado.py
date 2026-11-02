"""
Convierte una imagen (foto o grabado de archivo) en un grabado a tinta separado en capas, para
que la plantilla Archivo lo dibuje en pantalla capa por capa, como alguien que lo va trazando.

    python -I src/archivo/grabado.py <entrada> <carpeta_salida> [ancho]

Salida (PNG con transparencia, tinta #15120E):
  linea.png   el contorno, suelto y expresivo (lo primero que se dibuja)
  negro.png   los negros solidos (pelo, ropa): plumilla cargada
  trama1.png  rayado corto y cortado de las sombras medias
  trama2.png  rayado cruzado de las sombras
  aguada.png  gris suave de la piel y los medios tonos (tinta diluida)
  vista.png   todas juntas sobre papel, para revisar

Estilo del pin de referencia (ilustracion a plumilla, no grabado de billete): el fondo no se raya
(con `--persona` se recorta la figura con GrabCut y el fondo queda de papel), los trazos del rayado
son cortos y se interrumpen como hechos a mano, y la piel queda del color del papel con aguada.
"""
import sys
import os
import numpy as np
import cv2

TINTA = (14, 18, 21)  # BGR de #15120E
PAPEL = (198, 220, 230)  # BGR de #E6DCC6


def capa(alfa):
    """Alfa 0..1 -> PNG BGRA de tinta."""
    h, w = alfa.shape
    out = np.zeros((h, w, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = TINTA
    out[..., 3] = np.clip(alfa * 255, 0, 255).astype(np.uint8)
    return out


def rayado(h, w, angulo, paso, grosor, semilla, trazo=46):
    """Trazos paralelos cortos que ondulan y se interrumpen, como hechos con plumilla."""
    rng = np.random.default_rng(semilla)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.deg2rad(angulo)
    # Coordenada perpendicular a las lineas, con una ondulacion lenta y otra fina.
    u = xx * np.cos(a) + yy * np.sin(a)
    v = -xx * np.sin(a) + yy * np.cos(a)
    fase = rng.uniform(0, 6.28)
    u = u + 2.2 * np.sin(v / 37.0 + fase) + 0.8 * np.sin(v / 9.0 + fase * 2)
    d = np.abs(((u / paso) % 1.0) - 0.5) * paso  # distancia al centro de la linea
    linea = np.clip((grosor / 2 + 0.6 - d) / 1.2, 0, 1)
    # Cada linea se corta en trazos de largo variable, con su propio desfase: nada continuo.
    fila = np.floor(u / paso)
    desfase = (np.sin(fila * 12.9898 + semilla) * 43758.5453) % 1.0
    largo = trazo * (0.7 + 0.6 * ((np.sin(fila * 78.233 + semilla) * 12345.678) % 1.0))
    t = ((v / largo) + desfase) % 1.0
    return linea * np.clip((0.82 - t) / 0.06, 0, 1) * np.clip(t / 0.04, 0, 1)


def persona(img):
    """Mascara 0..1 de la figura (GrabCut desde un rectangulo central) con borde suave."""
    h, w = img.shape
    color = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    m = np.zeros((h, w), np.uint8)
    rect = (int(w * 0.06), int(h * 0.04), int(w * 0.88), int(h * 0.95))
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(color, m, rect, bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    f = np.where((m == 1) | (m == 3), 1.0, 0.0).astype(np.float32)
    return cv2.GaussianBlur(f, (0, 0), 3)


def main():
    entrada, salida = sys.argv[1], sys.argv[2]
    ancho = int(sys.argv[3]) if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else 1400
    recortar = '--persona' in sys.argv
    os.makedirs(salida, exist_ok=True)
    img = cv2.imread(entrada, cv2.IMREAD_GRAYSCALE)
    h0, w0 = img.shape
    img = cv2.resize(img, (ancho, int(h0 * ancho / w0)), interpolation=cv2.INTER_AREA)
    h, w = img.shape
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gris = clahe.apply(img)
    suave = cv2.bilateralFilter(gris, 9, 40, 9)

    # Contorno: boceto por "dodge" (gris / desenfoque del negativo) y umbral -> trazo de tinta.
    neg = 255 - suave
    borr = cv2.GaussianBlur(neg, (0, 0), 6)
    boceto = cv2.divide(suave, 255 - borr, scale=256)
    linea = np.clip((215 - boceto.astype(np.float32)) / 50.0, 0, 1)
    linea = cv2.morphologyEx((linea > 0.35).astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)).astype(np.float32) * linea

    # Tonos para el rayado: grosor de linea segun que tan oscuro es.
    tono = cv2.GaussianBlur(suave, (0, 0), 3).astype(np.float32) / 255.0
    def mascara(umbral, suav=0.06):
        return np.clip((umbral - tono) / suav, 0, 1)
    fig = persona(suave) if recortar else np.ones_like(tono)
    negro = mascara(0.2, 0.05) * fig
    t1 = rayado(h, w, 38, 8, 2.2, 1) * mascara(0.5) * fig * (1 - negro)
    t2 = rayado(h, w, -52, 8, 2.2, 2) * mascara(0.33) * fig * (1 - negro)
    aguada = np.clip((0.82 - tono) / 0.5, 0, 1) * 0.28 * fig
    linea = linea * fig

    capas = (('aguada', aguada), ('linea', linea), ('negro', negro), ('trama1', t1), ('trama2', t2))
    for nombre, alfa in capas:
        cv2.imwrite(os.path.join(salida, f'{nombre}.png'), capa(alfa))
    cv2.imwrite(os.path.join(salida, 'figura.png'), (fig * 255).astype(np.uint8))

    total = np.clip(aguada + linea + negro + t1 + t2, 0, 1)[..., None]
    vista = (np.array(PAPEL, np.float32) * (1 - total) + np.array(TINTA, np.float32) * total).astype(np.uint8)
    cv2.imwrite(os.path.join(salida, 'vista.png'), vista)
    print(f'{salida}: {w}x{h}')


if __name__ == '__main__':
    main()
