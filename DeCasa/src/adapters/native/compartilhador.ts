import { Share } from 'react-native';

import type { Compartilhador } from '../../application/ports/plataforma.ts';

/** Folha de compartilhamento do sistema (RF13). Arquivo (PDF) entra com o expo-sharing na etapa de exportar. */
export const compartilhadorDoSistema: Compartilhador = {
  async compartilharTexto(texto: string) {
    await Share.share({ message: texto });
  },
  async compartilharArquivo() {
    throw new Error('Compartilhar arquivo entra na etapa de exportar PDF.');
  },
};
