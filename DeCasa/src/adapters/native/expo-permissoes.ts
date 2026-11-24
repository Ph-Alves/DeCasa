import { requestRecordingPermissionsAsync } from 'expo-audio';

import type { Permissao, PermissoesDoSistema } from '../../application/ports/plataforma.ts';

/** RF17: cada permissão é pedida só na hora do uso. Câmera e fala entram com os adapters delas. */
export const expoPermissoes: PermissoesDoSistema = {
  async solicitar(tipo: Permissao) {
    if (tipo !== 'microfone') throw new Error(`Permissão "${tipo}" ainda não implementada.`);
    const { granted } = await requestRecordingPermissionsAsync();
    return granted ? 'concedida' : 'negada';
  },
};
