#!/bin/bash
# Proxies livianos (540 px, H.264, faststart) para ver cada pieza dentro del artefacto de Videos.
E="/g/Mi unidad/Redes sociales/Noviembre/Edited"; O="$1"
px() { # $1 id, resto: archivos de entrada (se concatenan si son varios)
  id="$1"; shift
  [ -f "$O/$id.mp4" ] && [ "$O/$id.mp4" -nt "$1" ] && return
  if [ $# -eq 1 ]; then
    ffmpeg -loglevel error -y -i "$1" -vf "scale=540:-2,fps=30" -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 96k -ac 2 -movflags +faststart "$O/$id.mp4"
  else
    args=(); f=""; i=0; for x in "$@"; do args+=(-i "$x"); f="$f[$i:v]scale=540:960,setsar=1,fps=30[v$i];"; i=$((i+1)); done
    c=""; for ((k=0;k<i;k++)); do c="$c[v$k]"; done
    ffmpeg -loglevel error -y "${args[@]}" -filter_complex "${f}${c}concat=n=$i:v=1:a=0[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 30 -movflags +faststart "$O/$id.mp4"
  fi
  echo "ok $id $(du -k "$O/$id.mp4" | cut -f1)KB"
}
for f in "$E"/Instagram/*/*-ig.mp4; do b=$(basename "$f" .mp4); id=${b%-*-ig}; [ "$id" = CAPAS ] && id=ctp-capas; [ "$id" = S2 ] && continue; px "$id" "$f"; done
px jd-kafka "$E/Instagram/Juanda.Trifuerza/jd-kafka--juanda.mp4"
for n in 1 2 3; do px jd-legal-design-$n "$E/jd-legal-design-$n--juanda.mp4"; done
C="$E/Carruseles"
px N31 "$C/Contrappto/n31-webinar-temario/n31-webinar-temario-linkedin.mp4"
px N32 "$C/Contrappto/n32-contratos-freelancer/n32-contratos-freelancer-linkedin.mp4"
px N38 "$C/Contrappto/n38-firmar-no-es-desconfiar/n38-firmar-no-es-desconfiar-linkedin.mp4"
px ACE-P1 "$C/Trifuerza.co/academy-ace-p1-hoja-en-blanco/academy-ace-p1-hoja-en-blanco-linkedin.mp4"
px ACE2 "$C/Trifuerza.co/academy-ace2-releer/academy-ace2-releer-linkedin.mp4"
px ACL-P1 "$C/Trifuerza.co/academy-acl-p1-tres-pasadas/academy-acl-p1-tres-pasadas-linkedin.mp4"
px ACL2 "$C/Trifuerza.co/academy-acl2-leer-rapido/academy-acl2-leer-rapido-linkedin.mp4"
px N15 "$C/Trifuerza.co/academy-n15-cinco-preguntas/academy-n15-cinco-preguntas-linkedin.mp4"
px N18 "$C/Trifuerza.co/c26-tech-antes-de-firmar/c26-tech-antes-de-firmar-linkedin.mp4"
for id in ACE-P2 ACE4 ACL-P2 ACL4; do px $id "$E"/Stories/Juanda.Trifuerza/$id-[0-9].mp4; done
for id in ACB0 ACB2 ACE-P3 ACE3 ACL-P3 ACL3; do px $id "$E"/Stories/Trifuerza.co/$id-[0-9].mp4; done
echo LISTO; du -sh "$O"
