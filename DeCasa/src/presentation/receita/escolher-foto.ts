import { launchCameraAsync, launchImageLibraryAsync, type ImagePickerOptions } from 'expo-image-picker';

import { perguntar } from './abrir-revisao.ts';

// A foto vira mídia da receita: qualidade boa para ler, sem pesar no aparelho (RNF04).
const OPCOES_DA_FOTO: ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };

/** Câmera (pedindo permissão, RF17) ou galeria. Devolve a uri temporária, ou null se cancelou ou não deu acesso. */
export async function escolherFoto(origem: 'camera' | 'galeria', pedirCamera: () => Promise<'concedida' | 'negada'>): Promise<string | null> {
  if (origem === 'camera' && (await pedirCamera()) === 'negada') {
    await perguntar('Sem acesso à câmera', 'Libere a câmera para o De Casa nos Ajustes, ou escolha uma foto que já está no aparelho.', [{ texto: 'Entendi' }]);
    return null;
  }
  const escolha = origem === 'camera' ? await launchCameraAsync(OPCOES_DA_FOTO) : await launchImageLibraryAsync(OPCOES_DA_FOTO);
  return escolha.canceled ? null : escolha.assets[0].uri;
}
