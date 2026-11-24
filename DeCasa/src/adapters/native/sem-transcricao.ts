import type { SpeechEngine } from '../../application/ports/plataforma.ts';

/**
 * shortcut: transcrição desligada até o spike S1 escolher a biblioteca (RF06, etapa 6).
 * O áudio continua guardado e a revisão abre vazia, com o áudio para ouvir enquanto escreve.
 */
export const semTranscricao: SpeechEngine = {
  isAvailable: async () => false,
  transcribe: async () => {
    throw new Error('Transcrição indisponível.');
  },
};
