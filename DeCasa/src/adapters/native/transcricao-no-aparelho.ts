import { TranscricaoLocal } from '../../../modules/transcricao-local/index.ts';
import type { OpcoesDeTranscricao, SpeechEngine } from '../../application/ports/plataforma.ts';

/**
 * RF06 com RNF03: transcreve o arquivo gravado só no aparelho, pelo módulo local (SpeechAnalyzer, iOS 26+).
 * Sem ele (iOS antigo, Android), fica indisponível e a revisão abre com o áudio para ouvir.
 * shortcut: sem Android; quando houver build Android, implementar o mesmo módulo com o reconhecedor do sistema.
 */
export const transcricaoNoAparelho: SpeechEngine = {
  async isAvailable(locale) {
    return (await TranscricaoLocal?.disponivel(locale)) ?? false;
  },

  async transcribe(audioUri: string, { signal }: OpcoesDeTranscricao) {
    const modulo = TranscricaoLocal;
    if (!modulo) throw new Error('Transcrição indisponível.');
    const cancelar = () => modulo.cancelar();
    signal?.addEventListener('abort', cancelar);
    try {
      return await modulo.transcrever(audioUri, 'pt-BR');
    } finally {
      signal?.removeEventListener('abort', cancelar);
    }
  },
};
