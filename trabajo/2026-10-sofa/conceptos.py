# Specs conceptuales de los videos del SOFA (12-oct-2026), escritos contra los guiones verificados
# (trabajo/2026-10-sofa/specs/*.txt): cada `desde`/`hasta` cae en un hueco de silencio real, cada
# turno en un hueco (o `fijo` si no hay pausa), cada golpe es una palabra dicha o un texto propio
# (cifras, etiquetas) y cada efecto y mundo sale del tema del personaje y de lo que dice.
#
# Segunda vuelta (13-oct-2026), con la revision de Juan David de los 13 videos:
#  - retratos por deteccion de caras (caras.py → caras.json), nunca a ojo; mascaras a mano desde la hoja;
#  - intros contextuales por tema (motivo: martillo, personaje, moneda, juego, protesto, tesoro,
#    plataformas, torneo, tienda, cartuchos, arcade) y cortinillas de nivel distintas por escena
#    (estilo: vs, seleccion, encuentro, mundo2d, jefe, resultado, mision), nada del mapa voxel;
#  - sin "halo de luz" (rayos) sobre Juan David en los cierres; sin chispas; sin TIP;
#  - personajes sin identificar van como `anonimo` (PLAYER N, sin ficha) en vez de inventarles nombre;
#  - mecanicas sin el Jefe Maestro ni el Sombrero de paja; partido en SOFA06 (Freezer) y SOFA07 (Maka) el 13-oct.
import json, os

CARAS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'caras.json'), encoding='utf8'))

JD = {"nombre": "Juan David", "clase": "Legal engineer · Trifuerza", "etiqueta": "PLAYER 1 READY", "mundo": "Profesor universitario · desarrollador de videojuegos", "color": "#F26B1D", "stats": [{"n": "DERECHO", "v": 1}, {"n": "CÓDIGO", "v": 1}, {"n": "VARITA", "v": 0.8}]}


def R(base, t, cerca, manual=None, duo=False, margen=1.9):
    """Recorte del retrato (fracciones del proxy 1080×1920) a partir de la cara detectada mas cercana a `cerca`
    (el foco del zoom de esa persona) o de una caja `manual` (x, y, w, h) para mascaras y cascos que la
    deteccion no ve. `duo` une las dos caras mas cercanas (Kaneki y Rize)."""
    entrada = CARAS.get(f"{base}|{t:g}", {"t": t, "caras": []})
    if manual:
        caras = [dict(zip("xywh", manual))]
    else:
        orden = sorted(entrada["caras"], key=lambda c: ((c["x"] + c["w"] / 2 - cerca[0]) ** 2 + (c["y"] + c["h"] / 2 - cerca[1]) ** 2) ** 0.5)
        caras = orden[:2] if duo else orden[:1]
        if not caras:
            raise SystemExit(f"sin cara para {base}@{t}")
        d = ((caras[0]["x"] + caras[0]["w"] / 2 - cerca[0]) ** 2 + (caras[0]["y"] + caras[0]["h"] / 2 - cerca[1]) ** 2) ** 0.5
        if d > 0.22:
            raise SystemExit(f"la cara mas cercana de {base}@{t} queda a {d:.2f} del foco: revisar caras/{base}-{t:g}.jpg")
    x0 = min(c["x"] for c in caras); x1 = max(c["x"] + c["w"] for c in caras)
    y0 = min(c["y"] for c in caras); y1 = max(c["y"] + c["h"] for c in caras)
    cx, cy, w = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0
    cw = w * margen
    # La ficha muestra 150×170 px: la altura del recorte sigue esa proporcion (en fracciones, 1080/1920).
    ch = cw * (1080 / 1920) * (170 / 150)
    if duo:
        ch = max(ch, (y1 - y0) * 1.6)
    x = min(max(0, cx - cw / 2), 1 - cw)
    y = min(max(0, cy - ch * 0.45), 1 - ch)
    return {"t": entrada.get("t", t), "x": round(x, 4), "y": round(y, 4), "w": round(cw, 4), "h": round(ch, 4)}


T = lambda desde, quien, fijo=False: ({"desde": desde, "quien": quien, "fijo": True} if fijo else {"desde": desde, "quien": quien})
G = lambda en, texto, estilo, **k: {"en": en, "texto": texto, "estilo": estilo, **k}
F = lambda tipo, en, dura=2, quien="p2", **k: {"tipo": tipo, "en": en, "dura": dura, "quien": quien, **k}
CORR = [{"de": "sofá", "a": "SOFA"}, {"de": "le pregunte", "a": "le pregunté"}, {"de": "Le pregunte", "a": "Le pregunté"}, {"de": "Cosplayers", "a": "cosplayers"}, {"de": "quien demandaría", "a": "quién demandaría"}, {"de": "artas", "a": "hartas"},
        # Cha Hae-in (Solo Leveling): "a todos los cazadores de este mundo, excepto Sung Jinwoo" (Whisper oyo "hace todo son gingos").
        {"de": "hace todo son", "a": "excepto"}, {"de": "gingos", "a": "Sung Jinwoo"},
        {"de": "Chimico Toga", "a": "Himiko Toga"}, {"de": "Magiro Academia", "a": "My Hero Academia"}, {"de": "Von Leinton", "a": "Von Lycaon"}, {"de": "Sunless On Zero", "a": "Zenless Zone Zero"}, {"de": "Aurora del League", "a": "Aurora de League"}, {"de": "Mavica", "a": "Mavuika"},
        {"de": "satura", "a": "La Vasija Pura"}, {"de": "te parece es a", "a": "te pareces a"}, {"de": "estás tú buena", "a": "está muy buena"}, {"de": "En como el fue", "a": "En cómo él fue"}, {"de": "indique", "a": "indie"},
        {"de": "Jägger", "a": "Jaeger"}, {"de": "Jäger", "a": "Jaeger"}, {"de": "capitano", "a": "Capitano"}, {"de": "herfría", "a": "le hizo"}, {"de": "Drugs del futuro", "a": "Trunks del futuro"}, {"de": "Sayajin", "a": "saiyajin"}, {"de": "María", "a": "mijo"}, {"de": "platico", "a": "platica"},
        # Freezer: "y si es saiyajin, mucho peor, lo eliminaré" (Whisper oyo "y si está allí").
        {"de": "si está allí", "a": "si es saiyajin"},
        {"de": "respaunear", "a": "respawnear"}, {"de": "Respawn", "a": "respawn"}, {"de": "cagunes", "a": "kagunes"}, {"de": "Maca", "a": "Maka"}, {"de": "SoulHitter", "a": "Soul Eater"}, {"de": "El jefe maestro", "a": "el Jefe Maestro"}, {"de": "Te letra... transportarme", "a": "¿Teletransportarme?"},
        {"de": "maquillero", "a": "Maki Gero"}, {"de": "ardestruir", "a": "destruir"}, {"de": "Joaquin Club", "a": "Jockey Club"}, {"de": "Frey", "a": "Fray"},
        {"de": "Vélula", "a": "Bélula"}, {"de": "Séfira", "a": "Céfira"}, {"de": "bótalo", "a": "vótalo"}, {"de": "alteratura", "a": "literatura"},
        {"de": "de mito", "a": "de Mito"}, {"de": "Esto es mito", "a": "Esto es Mito"}, {"de": "perracos espantos", "a": "Berracos Espantos"}, {"de": "Bogofighters", "a": "Bogo Fighters"}, {"de": "cráteras", "a": "criaturas"}, {"de": "podren", "a": "cobren"}, {"de": "viene a secta", "a": "hay una secta"}, {"de": "de acuerdos el la guardiente", "a": "de acuerdo, el aguardiente"}, {"de": "agua mendita", "a": "agua bendita"}, {"de": "desarrollos colombianos", "a": "desarrolladores colombianos"}, {"de": "colombia", "a": "Colombia"}, {"de": "Es está", "a": "Está"}]


def base(cuenta, cta, motivo, serie="SOFA 2026 · BOGOTÁ", intro=None):
    p = {"plantilla": "Arcade", "serie": serie, "nivel": "SOFA 2026", "cuentas": [cuenta], "velocidad": 1.08, "motivo": motivo,
         "lados": {"jd": "izquierda", "p2": "derecha"}, "nombres": {"jd": {"nombre": "JUAN DAVID"}}, "correcciones": CORR, "variantes": {cuenta: {"cta": cta, "copy": ""}}}
    if intro:
        p["intro"] = intro
    return p


def clip(archivo, desde, hasta, personaje=None, retrato=None, turnos=None, golpes=None, fx=None, foco=None, lados=None, tipo="clip", **k):
    e = {"tipo": tipo, "archivo": archivo, "desde": desde, "hasta": hasta, "golpes": golpes or [], "fx": fx or []}
    if personaje: e["personaje"] = personaje
    if retrato: e.update({"ficha": True, "fichaEn": 0.3, "retrato": retrato})
    if turnos: e["turnos"] = turnos
    if foco: e["foco"] = foco
    if lados: e["lados"] = lados
    e.update(k)
    return e


def P(nombre, clase, tema, color, stats, mundo="Cosplay · SOFA 2026", resumen=None, anonimo=False):
    p = {"nombre": nombre, "clase": clase, "tema": tema, "color": color, "mundo": mundo, "stats": [{"n": n, "v": v} for n, v in stats]}
    if resumen: p["resumen"] = resumen
    if anonimo: p["anonimo"] = True
    return p


nivel = lambda n, nombre, estilo, mundo=None, segundos=2.0: {"tipo": "nivel", "numero": n, "nombre": nombre, "estilo": estilo, "segundos": segundos, **({"mundo": mundo} if mundo else {})}
titulo = lambda **k: {"tipo": "titulo", "segundos": 3.4, "alto": 300, **k}
CENTRO = {"jd": {"x": 0.5, "y": 0.36, "escala": 1.12}}
B = lambda n: f"DJI_20261012_{n}_video"

# Intros y cierres comunes. Los `hasta` dejan 0,5 s de aire tras la ultima palabra (antes "vamos a ver que nos
# dijeron" se cortaba en "ver"). Sin `rayos` sobre Juan David en los cierres (13-oct-2026: "quita el halo de luz").
intro_demanda = clip("DJI_20261012_142400_960_video.mp4", 6.4, 13.2, lados={"jd": "centro"}, foco=CENTRO, golpes=[G("sorprenderán", "TE SORPRENDERÁN", "pastilla")], fx=[F("estrellas", "demandaría", 3, lado="centro", quien=None)])
cierre_demanda = clip("DJI_20261012_142516_966_video.mp4", 1.4, 8.4, tipo="cierre", lados={"jd": "centro"}, foco=CENTRO, golpes=[G("fantasía", "MUNDOS DE FANTASÍA", "pastilla")], cta="COMENTA A QUIÉN DEMANDARÍAS")
cierre_demanda2 = clip("DJI_20261012_151403_760_video.mp4", 1.0, 5.3, tipo="cierre", lados={"jd": "centro"}, foco=CENTRO, golpes=[G("demandaría", "¿Y EL TUYO?", "pastilla")], cta="COMENTA A QUIÉN DEMANDARÍAS")
# Retrato fijo de Juan David (imagen que el eligio, 13-oct-2026): el mismo en todas las fichas y cortinillas.
RETRATO_JD = {"fijo": "trabajo/2026-10-sofa/retratos-fuente/juan-david.png"}
retrato_jd_pareces = RETRATO_JD
intro_pareces = clip("DJI_20261012_142706_423_video.mp4", 1.3, 10.3, lados={"jd": "centro"}, foco=CENTRO, personaje=JD, retrato=retrato_jd_pareces, fichaDura=2.6, golpes=[G("identidad", "IDENTIDAD", "pastilla"), G("respondieron", "¿QUÉ NOS RESPONDIERON?", "golpe")], fx=[F("estrellas", "cosplayers", 3, lado="centro", quien=None)])
cierre_pareces = clip("DJI_20261012_151315_536_video.mp4", 0.9, 5.6, tipo="cierre", lados={"jd": "centro"}, foco=CENTRO, golpes=[G("pareces", "¿Y TÚ?", "pastilla")], cta="COMENTA EN QUÉ TE PARECES")
intro_cobra = clip("DJI_20261012_144737_376_video.mp4", 1.4, 10.6, lados={"jd": "centro"}, foco=CENTRO, golpes=[G("cobraría", "CUÁNTO COBRARÍA", "pastilla"), G("esperábamos", "NO LAS ESPERÁBAMOS", "daño")], fx=[F("monedas", "superpoder", 3, lado="centro", quien=None)])
cierre_cobra = clip("DJI_20261012_151328_376_video.mp4", 0.9, 5.8, tipo="cierre", lados={"jd": "centro"}, foco=CENTRO, golpes=[G("superpoder", "¿Y EL TUYO?", "pastilla")], fx=[F("monedas", "tú", 3, lado="centro", quien=None)], cta="COMENTA CUÁNTO COBRARÍAS")
intro_mec = clip("DJI_20261012_144625_616_video.mp4", 1.2, 14.2, lados={"jd": "centro"}, foco=CENTRO, golpes=[G("mecánica", "QUÉ MECÁNICA", "pastilla"), G("patentadas", "PATENTADAS", "daño")], fx=[F("estrellas", "videojuego", 2.5, lado="centro", quien=None), F("relampago", "patentadas", 1.4, lado="centro", quien=None, color="#F26B1D")],
                juego=[{"archivo": "broll/2026-10/sofa/claustro-caballero-1080x1920.mp4", "en": "gustaría", "hasta": "respuestas", "modo": "ventana", "desdeS": 6, "rotulo": "MECÁNICAS DE VIDEOJUEGO", "sub": "El Claustro en vivo · trifuerza.co"}])
cierre_mec = clip("DJI_20261012_151303_085_video.mp4", 1.4, 6.8, tipo="cierre", lados={"jd": "centro"}, foco=CENTRO, golpes=[G("real", "¿Y TÚ CUÁL?", "pastilla")], cta="COMENTA TU MECÁNICA")
cierre_web = clip("DJI_20261012_151344_201_video.mp4", 2.1, 7.9, tipo="cierre", lados={"jd": "centro"}, foco=CENTRO, golpes=[G("gratis", "PÁGINA WEB GRATIS", "xp")], fx=[F("estrellas", "votación", 4, lado="centro", quien=None, color="#F2C85B")], cta="VOTA · LINK EN EL PERFIL")

# Personajes que se repiten entre videos (misma ficha, mismo retrato).
OPERADOR = lambda: P("Operador", "Fuerzas especiales · Call of Duty", "ciudad", "#58D35A", [("COSPLAY", 0.9), ("ALTURA", 1), ("SIGILO", 0.6)], mundo="Operador táctico · visión nocturna", resumen="A una empresa minera")
R_OPERADOR = R(B("141732_578"), 10, (0.6, 0.41), manual=(0.54, 0.33, 0.13, 0.1))
TOGA = lambda resumen=None: P("Himiko Toga", "Villana · My Hero Academia", "terror", "#F06292", [("COSPLAY", 1), ("CAOS", 1), ("CORDURA", 0.1)], resumen=resumen)
FREEZER = lambda stat=("PIEDAD", 0), resumen=None: P("Freezer", "Emperador del universo 7 · Dragon Ball", "espacio", "#B388FF", [("COSPLAY", 1), ("MALDAD", 1), stat], resumen=resumen)
R_FREEZER = R("IMG_4876", 20, (0.22, 0.36), manual=(0.2, 0.47, 0.2, 0.16), margen=1.5)
KANEKI = lambda stat=("CONFIANZA", 0), resumen=None: P("Kaneki y Rize", "Ghouls · Tokyo Ghoul", "terror", "#E8323C", [("COSPLAY", 1), ("KAGUNE", 1), stat], resumen=resumen)
R_KANEKI = R("IMG_4880", 20, (0.55, 0.47), duo=True, margen=1.5)
TRUNKS = lambda stat=("FUTURO", 0.2), resumen=None: P("Trunks del futuro", "Guerrero saiyajin · Dragon Ball", "ciudad", "#B388FF", [("COSPLAY", 1), ("KI", 1), stat], resumen=resumen)
R_TRUNKS = R(B("162806_132"), 10, (0.65, 0.38))
ANGEMON = lambda stat=("DIGIVOLUCIÓN", 0.8), resumen=None: P("Angemon", "Digimon · Mundo digital", "digital", "#F2C85B", [("COSPLAY", 1), ("ALAS", 1), stat], resumen=resumen)
R_ANGEMON = R(B("151010_513"), 34, (0.62, 0.36), manual=(0.49, 0.35, 0.13, 0.11))
FOCO_FREEZER = {"jd": {"x": 0.62, "y": 0.4, "escala": 1.2}, "p2": {"x": 0.22, "y": 0.36, "escala": 1.25}}
FOCO_KANEKI = {"jd": {"x": 0.25, "y": 0.44, "escala": 1.3}, "p2": {"x": 0.6, "y": 0.42, "escala": 1.3}}
FOCO_TRUNKS = {"jd": {"x": 0.35, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.65, "y": 0.38, "escala": 1.38}}
FOCO_ANGEMON = {"jd": {"x": 0.35, "y": 0.38, "escala": 1.3}, "p2": {"x": 0.62, "y": 0.36, "escala": 1.38}}
FOCO_OPERADOR = {"jd": {"x": 0.38, "y": 0.42, "escala": 1.3}, "p2": {"x": 0.6, "y": 0.41, "escala": 1.38}}
FOCO_TOGA = {"jd": {"x": 0.35, "y": 0.4, "escala": 1.28}, "p2": {"x": 0.7, "y": 0.42, "escala": 1.38}}

piezas = []

# ───────────────────────────── SOFA01 · demanda
# SOFA01 abre con la Trifuerza voxel (Juan David, 13-oct: "estaba perfecta cuando era la Trifuerza"; el martillo, no).
piezas.append(dict(base("juanda", "Comenta a quién demandarías", "trifuerza"), slug="sofa-demanda", codigo="SOFA01", titulo="¿A quién demandaría tu personaje?", niveles=4, escenas=[
    titulo(), intro_demanda,
    # Cha Hae-in (Solo Leveling): el tramo arranca en la pregunta (se deja fuera el "Leo" con que la presento Juan David).
    clip("DJI_20261012_135441_015_video.mp4", 3.6, 12.0, P("Cha Hae-in", "Cazadora rango S · Solo Leveling", "mazmorra", "#E8323C", [("COSPLAY", 1), ("ESPADA", 0.9), ("LORE", 0.7)], resumen="A todos los cazadores, excepto Sung Jinwoo"), R(B("135441_015"), 6, (0.66, 0.43)),
         turnos=[T(3.6, "jd"), T(5.6, "p2"), T(9.3, "jd", True)],
         foco={"jd": {"x": 0.47, "y": 0.42, "escala": 1.3}, "p2": {"x": 0.66, "y": 0.43, "escala": 1.38}},
         # Dos golpes, no tres: la frase entera "A todos los cazadores de este mundo" vive como vecinas del remate.
         golpes=[G("excepto", "EXCEPTO SUNG JINWOO", "daño"), G("demandas", "HARTAS DEMANDAS", "xp")], fx=[F("corte", "cazadores", 1.2, color="#E8323C"), F("relampago", "excepto", 1.4, color="#E8323C"), F("aura", "abogados", 2.2, quien="jd", color="#F26B1D")]),
    nivel(2, "Pabellón 3", "mundo2d"),
    clip("DJI_20261012_141732_578_video.mp4", 7.6, 14.6, OPERADOR(), R_OPERADOR,
         turnos=[T(7.6, "jd"), T(10.5, "p2"), T(11.6, "jd", True)], foco=FOCO_OPERADOR,
         golpes=[G("minera", "EMPRESA MINERA", "daño")], fx=[F("onda", "minera", 1.2, color="#58D35A"), F("levitar", "grandes", 1.6, quien=None)]),
    nivel(3, "Heroes Zone", "jefe"),
    clip("DJI_20261012_150608_167_video.mp4", 15.5, 25.6, TOGA("Ella es la demandada"), R(B("150608_167"), 21, (0.62, 0.43)),
         turnos=[T(15.5, "jd"), T(18.9, "p2"), T(22.5, "jd"), T(24.1, "p2", True), T(25.5, "jd", True)], foco=FOCO_TOGA,
         golpes=[G("demandada", "ELLA ES LA DEMANDADA", "pastilla"), G("villana", "UNA VILLANA", "daño")], fx=[F("relampago", "demandada", 1.4, color="#F06292"), F("aura", "villana", 2, color="#F06292")]),
    cierre_demanda],
    verificar=[{"dato": "Cha Hae-in (Solo Leveling): identificacion de Juan David (13-oct); ella dice «a todos los cazadores de este mundo, excepto Sung Jinwoo»", "estado": "pendiente"},
               {"dato": "Operador tactico: en la ficha va «Fuerzas especiales · Call of Duty» por el equipo (gafas de vision nocturna de cuatro tubos, estilo Modern Warfare); si Juan David sabe la franquicia real, se cambia", "estado": "pendiente"}]))

# ───────────────────────────── SOFA08 · demanda parte 2
piezas.append(dict(base("juanda", "Comenta a quién demandarías", "protesto"), slug="sofa-demanda-2", codigo="SOFA08", titulo="¿A quién demandaría tu personaje? · Parte 2", niveles=4, escenas=[
    titulo(texto="¿A quién demandaría tu personaje?", parte="PARTE 2", alto=360), intro_demanda,
    clip("IMG_4876.MOV", 11.2, 27.2, FREEZER(resumen="A Akira Toriyama"), R_FREEZER,
         lados={"jd": "derecha", "p2": "izquierda"}, foco=FOCO_FREEZER,
         turnos=[T(11.2, "jd"), T(12.4, "p2"), T(14.7, "jd"), T(17.2, "p2")],
         golpes=[G("Toriyama", "AKIRA TORIYAMA", "daño"), G("padre", "MI PADRE", "golpe")], fx=[F("relampago", "Toriyama", 1.6, color="#B388FF"), F("aura", "padre", 2, color="#B388FF")]),
    nivel(2, "Tokio", "encuentro"),
    clip("IMG_4880.MOV", 5.1, 19.9, KANEKI(resumen="Rize, por alimentos; Kaneki, por matarla"), R_KANEKI,
         foco=FOCO_KANEKI,
         turnos=[T(5.1, "jd"), T(6.6, "p2"), T(11.7, "jd"), T(13.7, "p2", True)],
         golpes=[G("alimentos", "DEMANDAR ALIMENTOS", "pastilla"), G("mató", "FUE QUIEN ME MATÓ", "daño")], fx=[F("aura", "Ghoul", 2.5, color="#E8323C"), F("corte", "Kaneki", 1.3, color="#E8323C", vez=2), F("onda", "mató", 1.3, color="#E8323C")]),
    nivel(3, "Futuro alterno", "vs"),
    clip("DJI_20261012_162806_132_video.mp4", 35.5, 48.9, TRUNKS(resumen="A las autoridades"), R_TRUNKS,
         foco=FOCO_TRUNKS,
         # Trunks dice "enemigos como Maki Gero y luego a Cell" (Juan David, 13-oct-2026); Whisper oyo "maquillero" y "hacer".
         correcciones=[{"de": "luego hacer y", "a": "luego a Cell y"}],
         turnos=[T(35.5, "p2"), T(35.6, "jd", True), T(40.5, "p2", True)],
         golpes=[G("autoridades", "A LAS AUTORIDADES", "daño"), G("futuro", "DESTRUIR EL FUTURO", "golpe")], fx=[F("relampago", "autoridades", 1.6, color="#F2C85B"), F("fuego", "futuro", 2, color="#B388FF")]),
    cierre_demanda2],
    verificar=[{"dato": "Freezer, Kaneki y Rize, Trunks: nombres por confirmar. Freezer demanda a Akira Toriyama (autor fallecido): decisión de Juan David", "estado": "pendiente"}]))

# Anclas medidas de los crudos de SOFA02 (13-oct-2026, ventanas de Whisper sobre el proxy + astats): la alineacion por
# tramos de voz comprimia las frases ~2 s por el ruido de la feria. Se ancla el clip entero para que ninguna palabra
# fuera de sitio se cuele en un tramo vecino (las dos escenas de 134941 comparten crudo).
ANCLAS_HOLLOW = [["En como el fue elegido a la fuerza y es como", 5.2, 8.4], ["la perseverancia que él tiene", 8.5, 10.6], ["y la soledad que también tiene", 10.7, 13.0], ["Hollow Knight es un videojuego indie muy interesante juegalo", 13.4, 18.0]]
ANCLAS_AURORA_LYCAON = [["Y en qué te pareces a tu personaje", 4.5, 5.95], ["Que me cuesta hablar con las personas", 6.05, 8.6], ["Hoy estamos", 9.25, 10.9], ["con Von Leinton de Sunless On Zero", 11.0, 12.85], ["Y en qué te pareces a tu personaje", 12.9, 15.15], ["En el respeto hacia los demás", 15.25, 16.95], ["Bien pa bueno mil gracias Ahora", 17.75, 19.6]]

# ───────────────────────────── SOFA02 · pareces
# 13-oct-2026: intro propia (espejo de identidad) y "PARTE 1"/"PARTE 2" en el recuadro del titulo de las partes (SOFA02/03, 08, 10/11).
piezas.append(dict(base("juanda", "Comenta en qué te pareces", "espejo"), slug="sofa-pareces", codigo="SOFA02", titulo="¿En qué te pareces a tu personaje?", niveles=4, escenas=[
    titulo(parte="PARTE 1", alto=360), intro_pareces,
    # Hollow Knight: de la pregunta a "la soledad que también tiene". "La Vasija Pura" al inicio era ruido que Whisper
    # leyo como "satura", y el remate "Hollow Knight es un videojuego indie..." no se oye en el video (Juan David, 13-oct).
    # Segunda revision (13-oct): la alineacion comprimia la respuesta ~2,5 s ("soledad" en pantalla con "perseverancia" en
    # el audio) y el corte en 10,5 se comia "y la soledad que también tiene". Tiempos medidos con ventanas de Whisper:
    # respuesta desde ~5,2; "y la soledad que también tiene" 10,7–13,0; "Hollow Knight..." despues de 13,3.
    clip("DJI_20261012_132337_574_video.mp4", 3.6, 13.1, P("Hollow Knight", "La Vasija Pura · Hallownest", "hielo", "#9FE3FF", [("COSPLAY", 1), ("ALMA", 0.9), ("SOLEDAD", 1)], resumen="Elegido a la fuerza, perseverancia y soledad"), R(B("132337_574"), 8, (0.3, 0.42), manual=(0.24, 0.3, 0.19, 0.17)),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.5, "y": 0.42, "escala": 1.4}, "p2": {"x": 0.3, "y": 0.42, "escala": 1.45}}, omitir=["satura"], finDuro=13.15,
         anclas=ANCLAS_HOLLOW,
         turnos=[T(3.6, "jd"), T(5.15, "p2", True)],
         golpes=[G("fuerza", "A LA FUERZA", "golpe"), G("perseverancia", "+100 XP · PERSEVERANCIA", "xp"), G("soledad", "SOLEDAD", "daño")], fx=[F("aura", "elegido", 2.5, color="#9FE3FF"), F("corte", "perseverancia", 1.2, color="#F4EFE6"), F("nieve", "soledad", 2.2, color="#9FE3FF")]),
    nivel(2, "Bosque vastaya", "seleccion"),
    # Aurora y Von Lycaon (segunda revision, 13-oct): el spec iba ~1,5–2 s por delante del audio; la respuesta de Aurora
    # suena 6,0–8,6 (risas hasta 9,0), "Hoy estamos con" de Juan David desde ~9,2, la pregunta a Von Lycaon 12,9–15,15 y
    # su respuesta 15,25–16,95 ("Bien" en ~17,75). Medido con ventanas de Whisper sobre el proxy y astats.
    clip("DJI_20261012_134941_112_video.mp4", 1.6, 8.8, P("Aurora", "Vastaya · League of Legends", "bosque", "#B388FF", [("COSPLAY", 1), ("MAGIA", 0.9), ("SOCIAL", 0.2)], resumen="Le cuesta hablar con las personas"), R(B("134941_112"), 6, (0.75, 0.37)),
         lados={"jd": "centro", "p2": "derecha"}, foco={"jd": {"x": 0.45, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.72, "y": 0.38, "escala": 1.4}},
         finDuro=8.95, anclas=ANCLAS_AURORA_LYCAON,
         turnos=[T(1.6, "jd"), T(2.2, "p2", True), T(4.4, "jd", True), T(6.0, "p2", True)],
         golpes=[], fx=[F("luciernagas", "Aurora", 3, color="#B388FF"), F("aura", "cuesta", 2.4, color="#B388FF")]),
    # Von Lycaon: la presentacion ("Hoy estamos con Von Lycaon de Zenless Zone Zero") la dice Juan David, no el personaje;
    # el tramo termina en "los demás" (el "mil gracias, ahora" sobraba).
    clip("DJI_20261012_134941_112_video.mp4", 9.0, 17.0, P("Von Lycaon", "Mayordomo · Zenless Zone Zero", "digital", "#F2C85B", [("COSPLAY", 1), ("RESPETO", 1), ("ELEGANCIA", 0.9)], resumen="El respeto hacia los demás"), R(B("134941_112"), 17, (0.2, 0.37), manual=(0.14, 0.31, 0.13, 0.11)),
         lados={"jd": "centro", "p2": "izquierda"}, foco={"jd": {"x": 0.45, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.2, "y": 0.4, "escala": 1.4}},
         inicioDuro=9.0, finDuro=17.3,
         anclas=ANCLAS_AURORA_LYCAON,
         turnos=[T(9.0, "jd", True), T(15.2, "p2", True)],
         golpes=[], fx=[F("bits", "Zero", 2.5), F("aura", "respeto", 2.6, color="#F2C85B")]),
    nivel(3, "Doble calabozo", "jefe"),
    clip("DJI_20261012_135402_734_video.mp4", 1.0, 9.6, P("Estatua de Dios", "Jefe del doble calabozo · Solo Leveling", "terror", "#B8B4A8", [("COSPLAY", 1), ("TERROR", 0.9), ("RISA", 1)], resumen="La risa macabra"), R(B("135402_734"), 6, (0.6, 0.43)),
         foco={"jd": {"x": 0.35, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.62, "y": 0.38, "escala": 1.4}},
         turnos=[T(1.0, "jd"), T(2.3, "p2", True), T(3.4, "jd"), T(5.9, "p2", True), T(8.2, "jd", True)],
         golpes=[G("macabra", "RISA MACABRA", "daño")], fx=[F("niebla", "Christian", 3), F("relampago", "risa", 1.6, color="#B8B4A8")]),
    cierre_pareces],
    verificar=[{"dato": "Hollow Knight («La Vasija Pura», oído «La base satura»), Aurora (LoL), Von Lycaon (Zenless Zone Zero): por confirmar. La estatua gris es la Estatua de Dios de Solo Leveling (Juan David, 13-oct)", "estado": "pendiente"}]))

# ───────────────────────────── SOFA03 · pareces parte 2
piezas.append(dict(base("juanda", "Comenta en qué te pareces", "personaje"), slug="sofa-pareces-2", codigo="SOFA03", titulo="¿En qué te pareces a tu personaje? · Parte 2", niveles=5, escenas=[
    titulo(texto="¿En qué te pareces a tu personaje?", parte="PARTE 2", alto=360), intro_pareces,
    clip("DJI_20261012_141732_578_video.mp4", 3.9, 6.9, OPERADOR(), R_OPERADOR, fichaEn=0.2,
         foco=FOCO_OPERADOR, turnos=[T(3.9, "jd"), T(5.9, "p2")],
         golpes=[G("altura", "EN LA ALTURA", "pastilla")], fx=[F("levitar", "altura", 1.6, quien=None), F("onda", "altura", 1.2, color="#58D35A")]),
    nivel(2, "Heroes Zone", "vs"),
    clip("DJI_20261012_150608_167_video.mp4", 6.5, 14.2, TOGA("En lo loca"), R(B("150608_167"), 21, (0.62, 0.43)),
         foco=FOCO_TOGA, turnos=[T(6.5, "jd"), T(8.4, "p2"), T(11.1, "jd"), T(13.6, "p2")],
         golpes=[G("loca", "EN LO LOCA", "daño")], fx=[F("relampago", "loca", 1.5, color="#F06292"), F("aura", "Himiko", 2, color="#F06292")]),
    nivel(3, "Natlan", "mundo2d"),
    # Mavuika: un solo golpe con la frase entera; con dos (DUREZA y FIRMEZA a 0,7 s) el segundo se descartaba y "en la firmeza" no salia.
    clip("DJI_20261012_145125_425_video.mp4", 43.3, 49.2, P("Mavuika", "Arconte Pyro · Genshin Impact", "fuego", "#FF6B35", [("COSPLAY", 1), ("FUEGO", 1), ("FIRMEZA", 1)], resumen="En la dureza y la firmeza"), R(B("145125_425"), 47, (0.28, 0.42)),
         lados={"jd": "centro", "p2": "izquierda"}, foco={"jd": {"x": 0.47, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.2, "y": 0.4, "escala": 1.4}}, turnos=[T(43.3, "p2"), T(45.1, "jd"), T(47.5, "p2")],
         golpes=[G("dureza", "EN LA DUREZA, EN LA FIRMEZA", "golpe", lineas=["EN LA DUREZA,", "EN LA FIRMEZA"])], fx=[F("brasas", "Mavuika", 2.5), F("fuego", "dureza", 2.6, color="#FF6B35")]),
    # Eren: un solo golpe (la parte egoista); el resto de la frase, incluido "concentrarse en él", va en la caja.
    clip("DJI_20261012_144207_374_video.mp4", 27.6, 38.3, P("Eren Jaeger", "Legión de Reconocimiento · Attack on Titan", "muro", "#4FB65A", [("COSPLAY", 1), ("TITÁN", 0.9), ("EGOÍSMO", 0.8)], resumen="En la parte egoísta"), R(B("144207_374"), 31, (0.28, 0.38)),
         lados={"jd": "centro", "p2": "izquierda"}, foco={"jd": {"x": 0.5, "y": 0.38, "escala": 1.3}, "p2": {"x": 0.27, "y": 0.37, "escala": 1.38}}, turnos=[T(27.6, "jd"), T(29.8, "p2"), T(37.4, "jd", True)],
         golpes=[G("egoísta", "LA PARTE EGOÍSTA", "daño")], fx=[F("onda", "egoísta", 1.4, color="#4FB65A"), F("crecer", "forma", 1.8, quien=None), F("polvo", "capítulos", 3)]),
    nivel(4, "Mundo digital", "mision"),
    clip("DJI_20261012_151010_513_video.mp4", 30.8, 38.9, ANGEMON(resumen="A un ángel de un mundo digital"), R_ANGEMON,
         foco=FOCO_ANGEMON, turnos=[T(30.8, "jd"), T(33.3, "p2", True)],
         golpes=[G("ángel", "UN ÁNGEL", "pastilla"), G("digital", "MUNDO DIGITAL", "xp")], fx=[F("aura", "ángel", 3, color="#F2C85B"), F("levitar", "ángel", 2.5, quien=None), F("bits", "digital", 2.5)]),
    cierre_pareces],
    verificar=[{"dato": "Mavuika, Eren Jaeger (solo «en qué te pareces»; su respuesta de a quién demandaría no se usa), Angemon, Toga: por confirmar", "estado": "pendiente"},
               {"dato": "Operador tactico: «Fuerzas especiales · Call of Duty» por el equipo; confirmar franquicia", "estado": "pendiente"}]))

# ───────────────────────────── SOFA04 · cobraría (Trifuerza.co)
piezas.append(dict(base("trifuerza", "Link en el perfil", "moneda"), slug="sofa-cobra", codigo="SOFA04", titulo="¿Cuánto cobraría tu personaje por su superpoder?", niveles=4, escenas=[
    titulo(), intro_cobra,
    clip("DJI_20261012_144207_374_video.mp4", 5.4, 19.05, P("Mikasa Ackerman", "Legión de Reconocimiento · Attack on Titan", "muro", "#E8323C", [("COSPLAY", 1), ("FUERZA", 1), ("TARIFA", 0.6)], resumen="$3.000.000 al mes"), R(B("144207_374"), 10, (0.75, 0.41)),
         lados={"jd": "centro", "p2": "derecha"}, foco={"jd": {"x": 0.5, "y": 0.38, "escala": 1.3}, "p2": {"x": 0.78, "y": 0.37, "escala": 1.4}}, turnos=[T(5.4, "jd"), T(8.3, "p2"), T(13.7, "jd", True), T(17.1, "p2")],
         golpes=[G("titanes", "TODOS LOS TITANES", "daño"), G("millones", "$3.000.000 AL MES", "xp")], fx=[F("corte", "fuerte", 1.3, color="#E8323C"), F("dinero", "3", 2.6)]),
    nivel(2, "Teyvat", "mundo2d"),
    clip("DJI_20261012_145125_425_video.mp4", 31.8, 39.6, P("Capitano", "Heraldo Fatui · Genshin Impact", "hielo", "#9FE3FF", [("COSPLAY", 1), ("CRYO", 1), ("TARIFA", 1)], resumen="El descanso eterno"), R(B("145125_425"), 36, (0.75, 0.36), manual=(0.62, 0.3, 0.17, 0.15)),
         lados={"jd": "centro", "p2": "derecha"}, foco={"jd": {"x": 0.45, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.75, "y": 0.36, "escala": 1.35}}, turnos=[T(31.8, "jd"), T(33.2, "p2"), T(35.2, "jd"), T(38.0, "p2")],
         # astats (13-oct-2026, segunda medicion): la voz de Capitano sigue hasta 40,07 s; lo que Whisper ubica como
         # "¿Cuál es" a 39,7 es el final de "eterno" (la pregunta real arranca a 42,11). Corte en el silencio.
         finDuro=40.2,
         golpes=[G("eterno", "EL DESCANSO ETERNO", "daño")], fx=[F("nieve", "descanso", 2.6, color="#9FE3FF"), F("relampago", "eterno", 1.2, color="#9FE3FF")]),
    nivel(3, "Zona de terror", "jefe"),
    clip("DJI_20261012_150638_062_video.mp4", 13.0, 25.6, TOGA("3 mil dólares por persona"), R(B("150638_062"), 8, (0.61, 0.44)),
         foco={"jd": {"x": 0.35, "y": 0.37, "escala": 1.3}, "p2": {"x": 0.65, "y": 0.4, "escala": 1.4}}, turnos=[T(13.0, "jd"), T(21.3, "p2", True)], omitir=["puede usar su don"],
         golpes=[G("dólares", "3 MIL DÓLARES", "xp", vez=2), G("persona", "POR PERSONA", "pastilla")], fx=[F("dinero", "3", 2.6)]),
    cierre_cobra],
    verificar=[{"dato": "Mikasa, Capitano, Toga: por confirmar. Cifras tal cual las dicen", "estado": "pendiente"}]))

# ───────────────────────────── SOFA05 · cobraría parte 2 (Trifuerza.co): Freezer, Kaneki y Rize, y Trunks de ultimo
piezas.append(dict(base("trifuerza", "Link en el perfil", "tesoro"), slug="sofa-cobra-2", codigo="SOFA05", titulo="¿Cuánto cobraría tu personaje por su superpoder? · Parte 2", niveles=4, escenas=[
    titulo(texto="¿Cuánto cobraría tu personaje por su superpoder?", serie="SOFA 2026 · PARTE 2"), intro_cobra,
    clip("IMG_4876.MOV", 27.3, 37.4, FREEZER(resumen="La vida del universo 7"), R_FREEZER,
         lados={"jd": "derecha", "p2": "izquierda"}, foco=FOCO_FREEZER, turnos=[T(27.3, "jd"), T(30.2, "p2")],
         golpes=[G("universo", "LA VIDA DEL UNIVERSO 7", "daño"), G("eliminaré", "LO ELIMINARÉ", "golpe")], fx=[F("relampago", "vida", 2, color="#B388FF"), F("onda", "eliminaré", 1.4, color="#B388FF")]),
    nivel(2, "Tokio", "encuentro"),
    clip("IMG_4880.MOV", 32.3, 44.7, KANEKI(("TARIFA", 0), resumen="Comer gente: una necesidad"), R_KANEKI,
         foco=FOCO_KANEKI, turnos=[T(32.3, "jd"), T(34.3, "p2", True)],
         golpes=[G("gente", "COMER GENTE", "daño"), G("kagunes", "KAGUNES", "golpe")], fx=[F("relampago", "comer", 1.5, color="#E8323C"), F("onda", "kagunes", 1.5, color="#E8323C")]),
    nivel(3, "Futuro alterno", "resultado"),
    clip("DJI_20261012_162806_132_video.mp4", 1.0, 12.8, TRUNKS(("TARIFA", 1), resumen="$100.000.000"), R_TRUNKS,
         foco=FOCO_TRUNKS, turnos=[T(1.0, "jd"), T(2.7, "p2"), T(4.2, "jd"), T(6.5, "p2", True)],
         golpes=[G("saiyajin", "GUERRERO SAIYAJIN", "golpe"), G("millones", "$100.000.000", "xp")], fx=[F("aura", "saiyajin", 3, color="#F2C85B"), F("dinero", "100", 2.8)]),
    clip("DJI_20261012_162806_132_video.mp4", 15.1, 26.9, TRUNKS(("TARIFA", 1)),
         foco=FOCO_TRUNKS, turnos=[T(15.1, "jd"), T(18.8, "p2", True)],
         golpes=[G("barato", "ESTÁ BARATO", "pastilla"), G("barata", "LA ESTOY PONIENDO BARATA", "xp")], fx=[F("combo", "todo", 2.2, max=5), F("monedas", "barata", 2.5)]),
    cierre_cobra],
    verificar=[{"dato": "Trunks (oído «Drugs del futuro»), Freezer, Kaneki y Rize: por confirmar", "estado": "pendiente"}]))

# ───────────────────────────── SOFA06/07 · mecánica en dos partes
# 13-oct-2026 (Juan David): el video de cinco personajes quedo muy largo (86 s); se parte en dos. La parte 1 abre con
# Freezer y junta los poderes (respawn, combates por turnos, clones); la parte 2 abre con Maka y junta moverse por el
# mundo (mapa, teletransporte, plataformeo). Cada escena se conserva tal cual estaba aprobada.
# Intros propias de cada parte (13-oct-2026, "bien creativa, contextual y que diga PARTE 1 y PARTE 2"): la parte 1 es un
# combate por turnos (TURNOS / CLONES / RESPAWN) y la parte 2 un mapa con niebla que se abre y un teletransporte.
piezas.append(dict(base("juanda", "Comenta tu mecánica", "poderes"), slug="sofa-mecanica", codigo="SOFA06", titulo="¿Qué mecánica de videojuego traerías a la vida real?", niveles=4, velocidad=1.1, escenas=[
    titulo(parte="PARTE 1", alto=360), intro_mec,
    clip("IMG_4876.MOV", 38.6, 48.5, FREEZER(("RESPAWN", 1), resumen="Respawnear"), R_FREEZER,
         lados={"jd": "derecha", "p2": "izquierda"}, foco=FOCO_FREEZER, turnos=[T(38.6, "jd"), T(42.4, "p2"), T(47.4, "jd")],
         golpes=[G("respawnear", "RESPAWNEAR", "xp"), G("volver", "VOLVER A LA VIDA", "pastilla")], fx=[F("respawn", "respawnear", 2.4, quien=None), F("vida", "volver", 2.4, modo="cura"), F("estrellas", "cosa", 2)]),
    nivel(2, "Lado oscuro", "vs"),
    clip("DJI_20261012_145857_873_video.mp4", 16.9, 25.6, P("Darth Revan", "Señor Sith · Star Wars", "mazmorra", "#E8323C", [("COSPLAY", 1), ("LADO OSCURO", 1), ("PACIENCIA", 0.9)], resumen="Combates por turnos"), R(B("145857_873"), 20, (0.28, 0.42), manual=(0.19, 0.5, 0.16, 0.14)),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.6, "y": 0.4, "escala": 1.25}, "p2": {"x": 0.28, "y": 0.42, "escala": 1.3}}, turnos=[T(16.9, "jd"), T(20.2, "p2"), T(24.4, "jd")],
         golpes=[G("turnos", "COMBATES POR TURNOS", "pastilla")], fx=[F("turnos", "combates", 3.2), F("corte", "turnos", 1.2, color="#E8323C")]),
    nivel(3, "Mundo digital", "encuentro"),
    clip("DJI_20261012_151010_513_video.mp4", 15.5, 28.3, ANGEMON(("CLONES", 0.9), resumen="Clones para poder descansar"), R_ANGEMON,
         foco=FOCO_ANGEMON, turnos=[T(15.5, "jd"), T(18.7, "p2")],
         golpes=[G("Clones", "CLONES", "golpe"), G("descansar", "Y YO PODER DESCANSAR", "xp")], fx=[F("clones", "clonarme", 2.6, quien=None), F("nivelUp", "descansar", 2.4, texto="LEVEL UP!", stats=[["DESCANSO", 0.2, 1], ["LABORES", 0.9, 0.3], ["CLONES", 0, 1]])]),
    cierre_mec],
    verificar=[{"dato": "«Muchas mecánicas estuvieron patentadas» lo dice Juan David; en pantalla no se afirma cuál. Darth Revan identificado por el cosplay; Angemon, Freezer por confirmar", "estado": "pendiente"}]))

piezas.append(dict(base("juanda", "Comenta tu mecánica", "mapa"), slug="sofa-mecanica-2", codigo="SOFA07", titulo="¿Qué mecánica de videojuego traerías a la vida real? · Parte 2", niveles=3, velocidad=1.1, escenas=[
    titulo(texto="¿Qué mecánica de videojuego traerías a la vida real?", parte="PARTE 2", alto=360), intro_mec,
    # Maka (13-oct-2026, 3.a revision): Whisper corrio ~1 s toda la escena. Medido con astats sobre el proxy:
    # "...de Soul Eater" de ella 5,5-6,6 (el corte de 5,8 caia encima), pregunta de Juan David 7,5-11,8, Maka arranca
    # en 12,8 ("Bueno, hay varias que me gustaria" se tomaba como silencio y se cortaba) y "me pierdo muy facil"
    # termina en 24,06 (pegado a "entonces", sin pausa: `finDuro`).
    clip("IMG_4875.MOV", 7.45, 24.07, P("Maka Albarn", "Técnica de guadaña · Soul Eater", "terror", "#58D35A", [("COSPLAY", 1), ("ORIENTACIÓN", 0.1), ("MAPA", 1)], resumen="Ver todo el mapa con un botón"), R("IMG_4875", 60, (0.33, 0.47)),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.65, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.32, "y": 0.4, "escala": 1.38}}, turnos=[T(7.45, "jd"), T(12.8, "p2")], finDuro=24.07,
         anclas=[["soy Maca de SoulHitter.", 5.45, 6.65], ["¿Y cuéntanos", 7.5, 8.05], ["qué mecánica de", 8.2, 9.35], ["videojuego traerías a la vida real?", 9.9, 11.8],
                 ["Bueno, hay varias que me gustaría,", 12.82, 14.62], ["las cosas,", 20.3, 20.64], ["porque", 21.02, 21.42], ["soy muy...", 21.86, 22.6], ["me pierdo muy fácil,", 22.65, 24.06],
                 # Fuera del tramo (aproximado): solo para que no quede intercalado con lo de arriba.
                 ["entonces acá el celular es un lugar peligroso,", 24.1, 25.9]],
         golpes=[G("mapa", "MAPA", "pastilla"), G("pierdo", "ME PIERDO", "daño")], fx=[F("mapa", "mapa", 4), F("teletransporte", "botón", 1.4, quien=None)],
         juego=[{"archivo": "broll/2026-10/sofa/claustro-caballero-1920x1080.mp4", "en": "dónde", "hasta": "pierdo", "modo": "ventana", "desdeS": 10, "rotulo": "MAPA · EL CLAUSTRO", "sub": "trifuerza.co/juego-urosario"}]),
    nivel(2, "Entrada principal", "mundo2d", mundo="ciudad"),
    # Duo sin franquicia identificada: sin ficha ni nombre inventado; en el dialogo son PLAYER 3 (despues de Maka).
    clip("DJI_20261012_150400_698_video.mp4", 26.2, 37.6, P("Dúo cosplay", "Cosplayers", "ciudad", "#B388FF", [], resumen="Teletransportarse y el plataformeo", anonimo=True),
         foco={"jd": {"x": 0.25, "y": 0.36, "escala": 1.3}, "p2": {"x": 0.65, "y": 0.36, "escala": 1.3}}, turnos=[T(26.2, "jd"), T(28.9, "p2", True)],
         golpes=[G("teletransportarme", "TELETRANSPORTARME", "golpe"), G("plataformeo", "EL PLATAFORMEO", "pastilla", vez=2), G("libertad", "LIBERTAD", "xp")], fx=[F("teletransporte", "teletransportarme", 1.6, quien=None), F("plataformas", "plataformeo", 3), F("dobleSalto", "poderte", 1.6, quien=None)]),
    cierre_mec],
    verificar=[{"dato": "«Muchas mecánicas estuvieron patentadas» lo dice Juan David; en pantalla no se afirma cuál. Maka Albarn (oído «Maca de SoulHitter») por confirmar", "estado": "pendiente"},
               {"dato": "El dúo del plataformeo no se identifico: va sin ficha, como PLAYER 3", "estado": "pendiente"}]))

# ───────────────────────────── SOFA09 · Rosario
piezas.append(dict(base("juanda", "Comenta VIDEO", "juego", serie="SOFA 2026 · TRIFUERZA TECHNOLOGY"), slug="sofa-rosario", codigo="SOFA09", titulo="Hicimos un videojuego para la Universidad del Rosario", niveles=4,
    juegoFondo={"archivo": "broll/2026-10/sofa/claustro-caballero-1080x1920.mp4", "desdeS": 6}, escenas=[
    titulo(),
    # Arranca en "He desarrollado": antes hay risas (3,1–4,4) y el "He" va de 4,45 a 4,69; el hueco de 4,73 es el cierre
    # de la "d", no una pausa. Medido silenciando todo antes del corte con el contexto intacto: en 4,43 Whisper oye
    # "He desarrollado", en 4,74 no. Se corta en el hueco de 4,39 (inicioDuro=4.38) para que la rampa de
    # volumen de 2 cuadros del tramo termine antes del "He". La frase final la comprimio Whisper ~1,3 s:
    # "comenta video y haremos un video explicándolo" va de 26,75 a 29,93 (voz) y despues hay feria hasta 30,5,
    # donde habla otra persona ("¿Casi? ¿Tenemos que irse ya?", omitido). Dice "este videojuego", no "este video".
    clip("IMG_4882.MOV", 4.38, 29.95, dict(JD, clase="Desarrollador · Trifuerza Technology"), RETRATO_JD, fichaDura=2.4, velocidad=1.06, lados={"jd": "centro"}, foco={"jd": {"x": 0.5, "y": 0.34, "escala": 1.15}},
         inicioDuro=4.38, finDuro=30.4, anclas=[["He desarrollado el videojuego del claustro de la Universidad", 4.45, 7.9], ["comenta video y haremos un video explicándolo", 26.75, 29.93]], omitir=["monstruos", "en la costa", "Casi", "Tenemos que irse ya"],
         correcciones=[{"de": "hice este video", "a": "hice este videojuego"}],
         juego=[{"archivo": "broll/2026-10/sofa/claustro-caballero-1080x1920.mp4", "en": "claustro", "hasta": "personajes", "modo": "lleno", "desdeS": 2, "rotulo": "EL CLAUSTRO EN VIVO", "sub": "trifuerza.co/juego-urosario"},
                {"archivo": "broll/2026-10/sofa/claustro-hechicera-1080x1920.mp4", "en": "personajes", "hasta": "misterio", "modo": "dividido", "desdeS": 4, "rotulo": "PERSONAJES NO JUGABLES", "sub": "Caldas · Mutis · Camilo Torres"},
                {"archivo": "broll/2026-10/sofa/claustro-caballero-1920x1080.mp4", "en": "biblioteca", "hasta": "Si", "modo": "ventana", "desdeS": 12, "rotulo": "BIBLIOTECA ESCONDIDA", "sub": "y el Jockey Club"}],
         golpes=[G("Rosario", "UNIVERSIDAD DEL ROSARIO", "pastilla"), G("escondida", "BIBLIOTECA ESCONDIDA", "golpe"), G("video", "COMENTA VIDEO", "xp")],
         fx=[F("estrellas", "desarrollado", 3, lado="centro", quien=None)], cta="COMENTA VIDEO", tipo="cierre"),
    {"tipo": "juego", "archivo": "broll/2026-10/sofa/claustro-hechicera-1080x1920.mp4", "desdeS": 16, "segundos": 5, "rotulo": "JUEGA EN TRIFUERZA.CO/JUEGO-UROSARIO", "sub": "Multijugador en vivo · tu disfraz en pixel art", "texto": "Entra con tu disfraz convertido en pixel art y recorre el Claustro con quien esté jugando."}],
    verificar=[{"dato": "La Universidad del Rosario autorizó nombrarla (1-oct-2026)", "estado": "verificado"}]))

# ───────────────────────────── SOFA10 · emprendedores (Trifuerza.co)
TORNEO = {"participantes": ["Bélula", "Corte del dragón", "Janía Abril", "Cacher Studio"]}
piezas.append(dict(base("trifuerza", "Vota: link en el perfil", "torneo", serie="SOFA 2026 · TRIFUERZA TECHNOLOGY", intro=TORNEO), slug="sofa-emprendedores", codigo="SOFA10", titulo="Emprendedores del SOFA: ¿quién se gana la página web?", niveles=4, escenas=[
    titulo(parte="PARTE 1", alto=360),
    clip("DJI_20261012_140032_602_video.mp4", 0.3, 21.8, P("Bélula", "Artesana de criaturas fantásticas", "bosque", "#58D35A", [("ARTESANÍA", 1), ("FANTASÍA", 1), ("PÁGINA WEB", 0.1)], "Expositora · SOFA 2026", resumen="Amuletos y seres fantásticos"), R(B("140032_602"), 10, (0.35, 0.49)),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.65, "y": 0.33, "escala": 1.3}, "p2": {"x": 0.22, "y": 0.5, "escala": 1.35}}, turnos=[T(0.3, "jd"), T(7.0, "p2")],
         golpes=[G("amuletos", "AMULETOS", "pastilla"), G("dragones", "DRAGONES", "golpe")], fx=[F("luciernagas", "amuletos", 3), F("fuego", "dragones", 2.4, color="#58D35A")]),
    clip("DJI_20261012_140032_602_video.mp4", 35.7, 53.2, P("Bélula", "Artesana de criaturas fantásticas", "bosque", "#58D35A", [], "Expositora · SOFA 2026"),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.65, "y": 0.33, "escala": 1.3}, "p2": {"x": 0.3, "y": 0.45, "escala": 1.35}}, turnos=[T(35.7, "p2"), T(43.3, "jd", True), T(47.3, "jd")],
         golpes=[G("terapeuta", "MI TERAPEUTA", "pastilla"), G("gratis", "PÁGINA WEB GRATIS", "xp"), G("vótalo", "¡VÓTALO!", "golpe")], fx=[F("aura", "Céfira", 2.4, color="#58D35A"), F("estrellas", "gratis", 2.5, lado="centro", quien=None, color="#F2C85B")]),
    nivel(2, "La corte del dragón", "mision"),
    clip("DJI_20261012_141027_595_video.mp4", 1.6, 21.8, P("Lucía", "La corte del dragón artesano", "mazmorra", "#B388FF", [("TALLERES", 1), ("MEDIEVAL", 0.9), ("PÁGINA WEB", 0.1)], "Expositora · SOFA 2026", resumen="Talleres con ideas medievales"), R(B("141027_595"), 12, (0.65, 0.5)),
         foco={"jd": {"x": 0.3, "y": 0.32, "escala": 1.3}, "p2": {"x": 0.62, "y": 0.42, "escala": 1.35}}, turnos=[T(1.6, "jd"), T(3.3, "p2"), T(7.3, "jd"), T(9.8, "p2", True), T(20.3, "jd")],
         golpes=[G("medievales", "IDEAS MEDIEVALES", "pastilla"), G("recuerdo", "UN RECUERDO BONITO", "xp")], fx=[F("estrellas", "dragón", 2.4, color="#B388FF"), F("corte", "medievales", 1.2, color="#F4EFE6")]),
    cierre_web],
    verificar=[{"dato": "Concurso: un comercio del SOFA se gana una página web por votación (lo dice Juan David en cámara); mecánica y enlace por confirmar antes de publicar", "estado": "pendiente"}, {"dato": "Bélula (oído «Vélula»; el letrero del stand dice BÉLU…), Céfira, Lucía: escritura por confirmar", "estado": "pendiente"}]))

# ───────────────────────────── SOFA11 · emprendedores parte 2 (Trifuerza.co)
TIENDA = {"productos": ["Pesebres a mano", "Madera y resina", "Piezas 3D de terror", "Coleccionables", "Amuletos", "Talleres medievales"]}
piezas.append(dict(base("trifuerza", "Vota: link en el perfil", "tienda", serie="SOFA 2026 · TRIFUERZA TECHNOLOGY", intro=TIENDA), slug="sofa-emprendedores-2", codigo="SOFA11", titulo="Emprendedores del SOFA: ¿quién se gana la página web? · Parte 2", niveles=4, escenas=[
    titulo(texto="Emprendedores del SOFA: ¿quién se gana la página web?", parte="PARTE 2", alto=360),
    clip("DJI_20261012_141421_668_video.mp4", 1.7, 25.1, P("Janía Abril", "Profesora de artes plásticas", "pradera", "#F2C85B", [("ARTESANÍA", 1), ("20 AÑOS", 1), ("PÁGINA WEB", 0.1)], "Expositora · SOFA 2026", resumen="Más de 20 años de artesanía"), R(B("141421_668"), 15, (0.36, 0.43)),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.62, "y": 0.33, "escala": 1.3}, "p2": {"x": 0.35, "y": 0.34, "escala": 1.35}}, turnos=[T(1.7, "jd"), T(3.4, "p2"), T(4.5, "jd"), T(7.8, "p2")],
         golpes=[G("años", "MÁS DE 20 AÑOS", "golpe"), G("madera", "MADERA, CERÁMICA, RESINA", "pastilla")], fx=[F("estrellas", "madera", 2.6, color="#F2C85B")]),
    clip("DJI_20261012_141421_668_video.mp4", 25.6, 33.4, P("Janía Abril", "Profesora de artes plásticas", "pradera", "#F2C85B", [], "Expositora · SOFA 2026"),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.62, "y": 0.33, "escala": 1.3}, "p2": {"x": 0.35, "y": 0.34, "escala": 1.35}}, turnos=[T(25.6, "p2")],
         golpes=[G("pesebres", "PESEBRES HECHOS A MANO", "pastilla")], fx=[F("vida", "inspiración", 2.6, modo="cura")]),
    nivel(2, "Zona de terror", "encuentro"),
    clip("DJI_20261012_162551_174_video.mp4", 1.4, 25.3, P("Christian Cano", "Cacher Studio · piezas 3D de terror", "terror", "#E8323C", [("MONSTRUOS", 1), ("3D", 1), ("PÁGINA WEB", 0.1)], "Expositor · SOFA 2026", resumen="Monstruos y criaturas en 3D"), R(B("162551_174"), 12, (0.62, 0.5)),
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.72, "y": 0.36, "escala": 1.3}, "p2": {"x": 0.5, "y": 0.38, "escala": 1.35}}, turnos=[T(1.4, "jd"), T(2.7, "p2"), T(4.1, "jd"), T(5.1, "p2"), T(7.0, "jd"), T(9.2, "p2"), T(22.3, "jd")],
         golpes=[G("monstruos", "LOS MONSTRUOS", "daño"), G("coleccionables", "COLECCIONABLES", "pastilla")], fx=[F("niebla", "Cacher", 3), F("relampago", "terror", 1.6, color="#E8323C")]),
    clip("DJI_20261012_162551_174_video.mp4", 27.0, 31.0, sinVoz=True, sinZoom=True, lados={"jd": "centro"}, velocidad=1.0),
    cierre_web],
    verificar=[{"dato": "Janía Abril y Christian Cano (Cacher Studio): escritura por confirmar", "estado": "pendiente"}]))

# ───────────────────────────── SOFA12 · Mito (sin el b-roll que partia la entrevista)
# El ultimo de la lista es el que entra a la consola: el juego del video.
CARTUCHOS = {"juegos": ["BERRACOS ESPANTOS", "BOGO FIGHTERS", "MITO"]}
piezas.append(dict(base("juanda", "Juega colombiano", "cartuchos", serie="SOFA 2026 · INDIES COLOMBIANOS", intro=CARTUCHOS), slug="sofa-indies", codigo="SOFA12", titulo="Mito: el videojuego colombiano del Bogotazo", niveles=3, escenas=[
    titulo(),
    clip("DJI_20261012_152000_958_video.mp4", 1.2, 6.8, JD, R(B("152000_958"), 3, (0.65, 0.44)), fichaDura=2.4, lados={"jd": "derecha"}, foco={"jd": {"x": 0.62, "y": 0.4, "escala": 1.2}},
         golpes=[G("colombiano", "DESARROLLO COLOMBIANO", "pastilla")], fx=[F("estrellas", "videojuegos", 3, lado="centro", quien=None, color="#F2C85B")]),
    clip("DJI_20261012_152000_958_video.mp4", 7.0, 36.3, P("Nicolás Moros", "Director de arte · Mito", "ciudad", "#9FE3FF", [("ARTE", 1), ("REALISMO MÁGICO", 1), ("MISTERIO", 0.9)], "Videojuego colombiano"), R(B("152000_958"), 20, (0.44, 0.45)),
         foco={"jd": {"x": 0.62, "y": 0.42, "escala": 1.3}, "p2": {"x": 0.35, "y": 0.44, "escala": 1.35}}, turnos=[T(7.0, "p2"), T(9.4, "jd", True), T(12.1, "p2", True), T(34.6, "jd", True)],
         golpes=[G("mágico", "REALISMO MÁGICO", "pastilla"), G("periodista", "UNA PERIODISTA", "golpe"), G("Bogotazo", "EL BOGOTAZO", "daño"), G("gigantes", "RAÍCES GIGANTES", "golpe"), G("Dorado", "EL DORADO", "xp")],
         fx=[F("aura", "Mito", 2.4, color="#9FE3FF", vez=2), F("estrellas", "Colombia", 2.4, color="#F2C85B"), F("relampago", "Bogotazo", 1.4, color="#E8323C"), F("fuego", "destruyen", 2, color="#58D35A"), F("aura", "Dorado", 2.2, color="#F2C85B")]),
    clip("DJI_20261012_152000_958_video.mp4", 36.6, 43.2, P("Nicolás Moros", "Director de arte · Mito", "ciudad", "#9FE3FF", [], "Videojuego colombiano"), tipo="cierre",
         foco={"jd": {"x": 0.62, "y": 0.42, "escala": 1.3}, "p2": {"x": 0.35, "y": 0.44, "escala": 1.35}}, turnos=[T(36.6, "jd"), T(39.6, "p2"), T(41.9, "jd")],
         golpes=[G("nivel", "SUBIR DE NIVEL", "xp")], fx=[F("nivelUp", "subir", 2.6, texto="LEVEL UP!", stats=[["ARTE", 0.7, 1], ["LORE", 0.6, 1], ["WISHLIST", 0.2, 1]])], cta="MITO · AGRÉGALO A TU WISHLIST")],
    verificar=[{"dato": "Mito: director de arte Nicolás Moros, estudio Spectral Bird (leído en el stand); en desarrollo. Confirmar nombres", "estado": "pendiente"}]))

# ───────────────────────────── SOFA13 · Berracos Espantos + Bogo Fighters
# Retrato fijo de Bogo Fighters (imagen que eligio Juan David, 13-oct-2026: el recorte automatico le partia la cara)
# y metaforas de juego de peleas en vez del puño ("parece una arepa"): barras de vida + FIGHT!, seleccion de
# luchador, invocacion de los parceros (ASSIST!) y PERFECT! (efectos en remotion/arcade/Efectos.jsx).
RETRATO_BOGO = {"fijo": "trabajo/2026-10-sofa/retratos-fuente/bogo-fighters.png"}
ARCADE = {"juegos": ["BERRACOS ESPANTOS", "BOGO FIGHTERS"], "marquesina": "INDIES COLOMBIANOS"}
piezas.append(dict(base("juanda", "Juega colombiano", "arcade", serie="SOFA 2026 · INDIES COLOMBIANOS", intro=ARCADE), slug="sofa-indies-2", codigo="SOFA13", titulo="Berracos Espantos y Bogo Fighters: indies colombianos", niveles=3, escenas=[
    titulo(texto="Indies colombianos en el SOFA · Parte 2", serie="SOFA 2026 · INDIES COLOMBIANOS"),
    clip("DJI_20261012_152216_589_video.mp4", 1.4, 5.6, JD, R(B("152216_589"), 4, (0.21, 0.42)), fichaDura=2.2, lados={"jd": "izquierda"}, foco={"jd": {"x": 0.3, "y": 0.4, "escala": 1.25}},
         golpes=[G("colombianos", "DESARROLLADORES COLOMBIANOS", "pastilla")], fx=[F("estrellas", "videojuegos", 3, lado="centro", quien=None, color="#F2C85B")]),
    clip("DJI_20261012_152216_589_video.mp4", 5.8, 19.2, P("Berracos Espantos", "Machetazos con mitos y leyendas", "bosque", "#E8323C", [("MACHETE", 1), ("AGUARDIENTE", 1), ("AGUA BENDITA", 0.9)], "Videojuego colombiano", resumen="Machetazos con mitos y leyendas"), R(B("152216_589"), 12, (0.42, 0.42)),
         lados={"jd": "izquierda", "p2": "derecha"}, foco={"jd": {"x": 0.3, "y": 0.42, "escala": 1.3}, "p2": {"x": 0.42, "y": 0.42, "escala": 1.4}}, turnos=[T(5.8, "jd"), T(8.2, "p2", True)],
         golpes=[G("machetazos", "A MACHETAZOS", "daño"), G("aguardiente", "CON AGUARDIENTE", "xp"), G("bendita", "AGUA BENDITA", "pastilla")], fx=[F("corte", "machetazos", 1.3, color="#E8323C"), F("combo", "mitos", 2, max=4), F("vida", "revives", 2.4, modo="cura"), F("aura", "bendita", 2, color="#9FE3FF")]),
    clip("DJI_20261012_152216_589_video.mp4", 20.0, 29.9, P("Berracos Espantos", "Machetazos con mitos y leyendas", "bosque", "#E8323C", [], "Videojuego colombiano"),
         lados={"jd": "izquierda", "p2": "derecha"}, foco={"jd": {"x": 0.3, "y": 0.42, "escala": 1.3}, "p2": {"x": 0.42, "y": 0.42, "escala": 1.4}}, turnos=[T(20.0, "jd"), T(24.1, "p2", True), T(28.6, "jd", True), T(29.2, "p2", True)],
         golpes=[G("aguardiente", "EL AGUARDIENTE", "xp")], fx=[F("estrellas", "reviva", 2, color="#F2C85B")]),
    nivel(2, "Bogotá", "vs"),
    clip("DJI_20261012_151723_832_video.mp4", 0.8, 14.1, P("Bogo Fighters", "Peleas con sátira bogotana", "ciudad", "#F26B1D", [("PELEA", 1), ("SÁTIRA", 1), ("PARCEROS", 1)], "Videojuego colombiano", resumen="Peleas con sátira bogotana"), RETRATO_BOGO,
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.68, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.5, "y": 0.4, "escala": 1.4}}, turnos=[T(0.8, "jd"), T(2.3, "p2"), T(3.5, "jd"), T(5.8, "p2")],
         golpes=[G("Bogotá", "BOGOTÁ", "pastilla"), G("sátira", "LA SÁTIRA", "golpe")], fx=[F("pelea", "peleas", 3.0, nombres=["BOGO FIGHTERS", "JUAN DAVID"], escenario="BOGOTÁ"), F("lluvia", "Bogotá", 3), F("seleccion", "representar", 3.2)]),
    clip("DJI_20261012_151723_832_video.mp4", 14.3, 31.1, P("Bogo Fighters", "Peleas con sátira bogotana", "ciudad", "#F26B1D", [], "Videojuego colombiano"), tipo="cierre",
         lados={"jd": "derecha", "p2": "izquierda"}, foco={"jd": {"x": 0.68, "y": 0.4, "escala": 1.3}, "p2": {"x": 0.5, "y": 0.4, "escala": 1.4}}, turnos=[T(14.3, "jd"), T(17.0, "p2"), T(27.1, "jd", True), T(29.9, "p2", True)],
         golpes=[G("parceros", "LOS PARCEROS", "xp"), G("leyendas", "LEYENDAS COLOMBIANAS", "pastilla")], fx=[F("invocacion", "invocación", 4.2, color="#F2C85B"), F("perfecto", "chévere", 1.6, quien="jd")], cta="JUEGA COLOMBIANO")],
    verificar=[{"dato": "Berracos Espantos: confirmado por el letrero del stand (13-oct-2026). Bogo Fighters: confirmar con el stand", "estado": "pendiente"}]))

# Musica por capas segun el tema (13-oct-2026, "el mismo tuntun se vuelve pesadito"; src/audio/orquesta.js).
# SOFA01/02 ya estaban publicados y pautados: siguen con el chiptune (sin `musica`).
# Desactivado el 14-oct-2026: Juan David oyo la orquesta sintetizada y "suena horrible"; vuelve el chiptune.
MUSICA_DESCARTADA = {"sofa-pareces-2": "aventura", "sofa-cobra": "jazz", "sofa-cobra-2": "funk", "sofa-mecanica": "batalla", "sofa-mecanica-2": "synthwave",
          "sofa-demanda-2": "tribunal", "sofa-rosario": "aventura", "sofa-emprendedores": "electropop", "sofa-emprendedores-2": "jazz",
          "sofa-indies": "tribunal", "sofa-indies-2": "cumbia"}

BPM = {"sofa-pareces-2": 136, "sofa-cobra": 140, "sofa-cobra-2": 144, "sofa-mecanica": 140, "sofa-mecanica-2": 132, "sofa-demanda-2": 136, "sofa-rosario": 132, "sofa-emprendedores": 140, "sofa-emprendedores-2": 136, "sofa-indies": 132, "sofa-indies-2": 144}  # la idea aprobada, variada por video ("extrae la idea central y variala")
# Musica (14-oct-2026): el chiptune original a 140 BPM con `capas` (secciones de 2 compases que cambian timbre,
# arpegio y ritmo; las capas entran al arrancar). Juan David: "uff esa es". SOFA01/02 publicados se quedan como estan.
for p in piezas:
    if p["slug"] in ["sofa-pareces-2", "sofa-cobra", "sofa-cobra-2", "sofa-mecanica", "sofa-mecanica-2", "sofa-demanda-2", "sofa-rosario", "sofa-emprendedores", "sofa-emprendedores-2", "sofa-indies", "sofa-indies-2"]:
        p["bpm"] = BPM[p["slug"]]
        p["capas"] = True
        if p["slug"] == "sofa-mecanica":
            p["orden"] = [0, 1, 2, 3]  # la muestra aprobada, tal cual

# Plano medio (14-oct-2026, Juan David: "acercar las tomas que quedaron abiertas"). Medido con caras.py: alto de cara
# ~0,075 en Maka (proxy 4K: hasta ~2x) y ~0,085-0,09 en los intros/cierres DJI a 1,12x (grabados en 1080: tope 1,3x).
# El foco va al centro de la cara: el zoom crece alrededor de ese punto, asi la cara no se mueve de sitio.
# Solo SOFA03-13 (SOFA01/02 publicados); las constantes FOCO_* compartidas no se tocan.
ACERCAR = {
    ("sofa-pareces-2", 10): {"jd": {"x": 0.47, "y": 0.38, "escala": 1.3}},
    ("sofa-cobra", 1): {"jd": {"x": 0.5, "y": 0.42, "escala": 1.3}}, ("sofa-cobra-2", 1): {"jd": {"x": 0.5, "y": 0.42, "escala": 1.3}},
    ("sofa-mecanica", 1): {"jd": {"x": 0.46, "y": 0.4, "escala": 1.3}}, ("sofa-mecanica-2", 1): {"jd": {"x": 0.46, "y": 0.4, "escala": 1.3}},
    ("sofa-mecanica", 7): {"jd": {"x": 0.47, "y": 0.39, "escala": 1.3}}, ("sofa-mecanica-2", 5): {"jd": {"x": 0.47, "y": 0.39, "escala": 1.3}},
    ("sofa-mecanica-2", 2): {"jd": {"x": 0.67, "y": 0.4, "escala": 1.6}, "p2": {"x": 0.37, "y": 0.44, "escala": 1.65}},
    ("sofa-demanda-2", 1): {"jd": {"x": 0.48, "y": 0.35, "escala": 1.3}}, ("sofa-demanda-2", 7): {"jd": {"x": 0.44, "y": 0.32, "escala": 1.3}},
    ("sofa-emprendedores", 5): {"jd": {"x": 0.47, "y": 0.33, "escala": 1.3}}, ("sofa-emprendedores-2", 6): {"jd": {"x": 0.47, "y": 0.33, "escala": 1.3}},
    ("sofa-indies", 1): {"jd": {"x": 0.62, "y": 0.4, "escala": 1.3}}, ("sofa-indies-2", 1): {"jd": {"x": 0.3, "y": 0.4, "escala": 1.3}},
}
for p in piezas:
    for i, e in enumerate(p["escenas"]):
        if (p["slug"], i) in ACERCAR:
            e["foco"] = {**(e.get("foco") or {}), **ACERCAR[(p["slug"], i)]}

# Chiptune con perrengue por video (14-oct-2026, src/audio/chip.js: groove del juego del Claustro). SOFA01/02 sin `chip`.
CHIP = {}  # variantes descartadas el 14-oct-2026 ("este metodo no nos funciono"): vuelve el chiptune original
for p in piezas:
    if p["slug"] in CHIP:
        p["chip"] = CHIP[p["slug"]]

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Con slugs como argumento solo se reescriben esas piezas: las demas conservan su `generado` y no hay que
# rearmarlas (una correccion puntual no toca los videos ya aprobados). Sin argumentos, todas.
import sys
pedidas = set(sys.argv[1:])
desconocidas = pedidas - {p['slug'] for p in piezas}
if desconocidas:
    sys.exit(f"slug desconocido: {', '.join(sorted(desconocidas))}")
elegidas = [p for p in piezas if not pedidas or p['slug'] in pedidas]
for p in elegidas:
    json.dump(p, open(os.path.join(RAIZ, 'piezas', '2026-10', f"{p['slug']}.json"), 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print(len(elegidas), 'piezas:', ', '.join(p['slug'] for p in elegidas))
