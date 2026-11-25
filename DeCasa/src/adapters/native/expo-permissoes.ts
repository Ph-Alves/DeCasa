import { requestRecordingPermissionsAsync } from 'expo-audio';
import { requestCameraPermissionsAsync } from 'expo-image-picker';

import { TranscricaoLocal } from '../../../modules/transcricao-local/index.ts';
import type { Permissao, PermissoesDoSistema } from '../../application/ports/plataforma.ts';

/** RF17: cada permissão é pedida só na hora do uso. */
export const expoPermissoes: PermissoesDoSistema = {
  async solicitar(tipo: Permissao) {
    const pedir = {
      microfone: requestRecordingPermissionsAsync,
      camera: requestCameraPermissionsAsync,
      // Só a de reconhecimento de fala: o microfone não é usado para transcrever arquivo.
      fala: async () => ({ granted: (await TranscricaoLocal?.pedirPermissao()) ?? false }),
    }[tipo];
    const { granted } = await pedir();
    return granted ? 'concedida' : 'negada';
  },
};
