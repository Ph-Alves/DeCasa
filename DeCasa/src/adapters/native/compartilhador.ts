import { shareAsync } from 'expo-sharing';
import { Share } from 'react-native';

import type { Compartilhador } from '../../application/ports/plataforma.ts';

/** Folha de compartilhamento do sistema: texto (RF13) e PDF (RF14). */
export const compartilhadorDoSistema: Compartilhador = {
  async compartilharTexto(texto: string) {
    await Share.share({ message: texto });
  },
  async compartilharArquivo(uri: string) {
    await shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Enviar o livro' });
  },
};
