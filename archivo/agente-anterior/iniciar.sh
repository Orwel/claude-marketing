#!/usr/bin/env bash
# ============================================================
#  Hub de marketing — doble clic (macOS/Linux) o ./iniciar.sh
#
#  En macOS, para que funcione con doble clic desde Finder:
#    chmod +x iniciar.sh && mv iniciar.sh iniciar.command
# ============================================================

cd "$(dirname "$0")" || exit 1

echo
echo "  Hub de marketing"
echo "  ----------------"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  [X] No encuentro Node.js."
  echo
  echo "      Instalalo desde https://nodejs.org (version 20 o superior)"
  echo "      y vuelve a ejecutar este archivo."
  echo
  read -r -p "  Pulsa Enter para cerrar."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Primera ejecucion: instalando dependencias."
  echo "  Esto tarda un par de minutos, solo pasa una vez."
  echo
  if ! npm install; then
    echo
    echo "  [X] Fallo la instalacion. Revisa el error de arriba."
    read -r -p "  Pulsa Enter para cerrar."
    exit 1
  fi
  echo
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "  [!] He creado el archivo .env a partir de la plantilla."
  echo "      Abrelo y pon tus claves antes de generar nada."
  echo
fi

echo "  Arrancando en http://localhost:4321"
echo "  Deja esta ventana abierta. Cierrala para apagar el hub."
echo

# Se abre el navegador en segundo plano tras un momento, para que el
# servidor este escuchando cuando llegue la peticion.
( sleep 2
  if command -v open >/dev/null 2>&1; then open http://localhost:4321
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:4321
  fi ) &

npm run hub

echo
echo "  El hub se ha detenido."
read -r -p "  Pulsa Enter para cerrar."
