import { requestRecordingPermissionsAsync } from 'expo-audio';
import { requestCameraPermissionsAsync } from 'expo-image-picker';

import type { Permissao, PermissoesDoSistema } from '../../application/ports/plataforma.ts';

/** RF17: cada permissão é pedida só na hora do uso. A de fala entra com o adapter de transcrição. */
export const expoPermissoes: PermissoesDoSistema = {
  async solicitar(tipo: Permissao) {
    if (tipo === 'fala') throw new Error('Permissão "fala" ainda não implementada.');
    const { granted } = await (tipo === 'microfone' ? requestRecordingPermissionsAsync() : requestCameraPermissionsAsync());
    return granted ? 'concedida' : 'negada';
  },
};
