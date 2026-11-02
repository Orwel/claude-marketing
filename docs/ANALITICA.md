# Analítica de Instagram, gratis

Reemplaza a Metricool con la API de Meta, que es gratis. Un solo token lee las tres
cuentas: juanda.trifuerza, trifuerza.co y Contrappto.

```
npm run analitica -- cuentas     # revisa el token y lista las cuentas que ve
npm run analitica                # baja los datos y escribe analitica/AAAA-MM-DD/reporte.md
```

El reporte trae por cuenta:
- **Mejores horas:** seguidores conectados por hora, lunes a viernes, de los últimos 30 días. Es la misma base que usa Metricool. Si Meta no la da (menos de 100 seguidores), se usa el alcance de tus piezas según la hora en que se publicaron.
- **Ranking:** alcance, vistas, compartidos, guardados y vista promedio de cada reel o carrusel que lleve 72 h o más publicado.
- **Pautar:** se marca cuando la pieza iguala o supera la mediana de la cuenta en alcance **y** en señal. La señal es compartidos + guardados por cada mil personas alcanzadas.

Las stories no entran: Meta solo guarda sus métricas 24 h. LinkedIn tampoco: su API
no es gratis. Para LinkedIn, exporta el Excel de analítica cada mes a `analitica/linkedin/`.

## Configuración, una sola vez (~20 min)

### 1. Cuentas profesionales ligadas a su página
En cada cuenta de Instagram, abre Configuración → Tipo de cuenta y herramientas. Debe
decir **Creador** o **Empresa**. Luego, en Meta Business Suite → Configuración, revisa
que cada cuenta esté conectada a su página de Facebook: juanda.trifuerza a la tuya,
trifuerza.co a Trifuerza y Contrappto a Contrappto. Sin página, la API no ve la cuenta.

### 2. Crear la app en Meta
1. Entra a https://developers.facebook.com/apps con tu Facebook, el que administra las tres páginas.
2. **Crear app**. Nombre: `Trifuerza analítica`. En caso de uso, elige **Otro** y luego tipo **Empresa**.
3. Dentro de la app, en **Agregar productos**, busca **Instagram** → **Configurar** y elige la opción **con inicio de sesión de Facebook**.

La app se queda en **modo desarrollo**. Así funciona sin que Meta la revise, porque solo
la usas tú, que eres el administrador. No hay que publicarla ni pagar nada.

### 3. Generar el token
1. Abre el explorador: https://developers.facebook.com/tools/explorer
2. Arriba a la derecha, en **Aplicación de Meta**, elige `Trifuerza analítica`. En **Usuario o página**, elige **Token de usuario**.
3. En **Permisos**, agrega:
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`
   (más adelante, para medir la pauta: `ads_read`)
4. Clic en **Generate Access Token**. En la ventana de Facebook, marca **las tres páginas y las tres cuentas de Instagram**.

### 4. Volverlo de 60 días y guardarlo
El token que sale del explorador dura 1 hora. Para alargarlo:
1. Clic en el ícono **ⓘ** junto al token → **Abrir en herramienta de token de acceso**.
2. Abajo, **Extender token de acceso**. Copia el token largo que aparece.
3. Pégalo en `.env`, en la línea `IG_ACCESS_TOKEN=`. **No lo pegues en el chat**: es una llave de tus cuentas.
4. Prueba con `npm run analitica -- cuentas`. Deben salir las tres cuentas.

Si falta alguna cuenta, lo más común es que la página esté en un portafolio comercial.
Repite el paso 3 agregando también el permiso `business_management`.

### 5. Renovar cada ~60 días
El script avisa cuando al token le quedan menos de 10 días. Para renovarlo, repite los
pasos 3 y 4 y reemplaza la línea en `.env`.
