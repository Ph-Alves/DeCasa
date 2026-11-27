import { requireOptionalNativeModule } from 'expo';

/** Só existe no iOS (dev build). No Android e no Expo Go é null: a transcrição fica indisponível. */
export const TranscricaoLocal = requireOptionalNativeModule<{
  disponivel(idioma: string): Promise<boolean>;
  pedirPermissao(): Promise<boolean>;
  transcrever(uri: string, idioma: string): Promise<string>;
  cancelar(): void;
}>('TranscricaoLocal');
