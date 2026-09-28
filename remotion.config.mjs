import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// H.264 + yuv420p es lo que Instagram, TikTok y YouTube aceptan sin recodificar.
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
// Sin esto los cuadros JPEG salen como yuvj420p (rango completo) y sin espacio
// de color declarado: las redes lo recodifican y los colores de marca se lavan.
Config.setColorSpace('bt709');
// OffthreadVideo tarda en servir el primer cuadro de un .mp4 de 1080p cuando el
// equipo esta cargado: con los 30 s por defecto el render moria en el cuadro 0.
Config.setDelayRenderTimeoutInMilliseconds(120000);
