import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// H.264 + yuv420p es lo que Instagram acepta sin recodificar.
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
