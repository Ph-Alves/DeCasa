import { RecordingPresets, setAudioModeAsync, type AudioRecorder as GravadorDoExpo, type RecordingOptions } from 'expo-audio';

import type { AudioRecorder } from '../../application/ports/plataforma.ts';

/** RNF10: AAC mono a 64 kbps (cerca de 480 KB por minuto, a confirmar no spike S5). */
export const OPCOES_DE_GRAVACAO: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64_000 };

/**
 * O expo-audio só cria o gravador pelo hook `useAudioRecorder`, que fica na tela.
 * Este adapter recebe esse gravador e cumpre o port usado pelo CapturarPorVoz.
 */
export class ExpoAudioRecorder implements AudioRecorder {
  private readonly gravador: GravadorDoExpo;

  constructor(gravador: GravadorDoExpo) {
    this.gravador = gravador;
  }

  async start(): Promise<void> {
    // playsInSilentMode: a voz da vó toca mesmo com o iPhone no silencioso.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await this.gravador.prepareToRecordAsync();
    this.gravador.record();
  }

  async stop(): Promise<{ uri: string; durationSec: number }> {
    const durationSec = this.gravador.currentTime;
    await this.gravador.stop();
    // Sem isso o iOS continua tocando pelo alto-falante de ligação, bem baixinho.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (!this.gravador.uri) throw new Error('A gravação não gerou arquivo.');
    return { uri: this.gravador.uri, durationSec };
  }
}
