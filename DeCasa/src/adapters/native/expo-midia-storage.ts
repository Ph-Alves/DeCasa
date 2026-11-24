import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { MidiaStorage } from '../../application/ports/plataforma.ts';

const PASTA = 'midias';
const EXTENSAO_PADRAO = { audio: '.m4a', foto: '.jpg' } as const;

/** Áudios e fotos em `documentos/midias/`, área privada do app (RN05, RNF09). */
export class ExpoMidiaStorage implements MidiaStorage {
  private readonly pasta = new Directory(Paths.document, PASTA);

  async guardar(uriTemporaria: string, tipo: 'audio' | 'foto') {
    this.pasta.create({ intermediates: true, idempotent: true });
    const origem = new File(uriTemporaria);
    const nome = `${randomUUID()}${origem.extension || EXTENSAO_PADRAO[tipo]}`;
    const destino = new File(this.pasta, nome);
    await origem.copy(destino);
    return { caminhoLocal: `${PASTA}/${nome}`, tamanhoBytes: destino.size };
  }

  uri(caminhoLocal: string): string {
    return new File(Paths.document, caminhoLocal).uri;
  }

  async apagar(caminhoLocal: string): Promise<void> {
    // Só apaga o que é nosso: um caminho vindo de dado corrompido não pode sair da pasta de mídias.
    if (!caminhoLocal.startsWith(`${PASTA}/`) || caminhoLocal.includes('..')) return;
    const arquivo = new File(Paths.document, caminhoLocal);
    if (arquivo.exists) arquivo.delete();
  }

  async espacoUsado(): Promise<number> {
    return this.pasta.exists ? (this.pasta.size ?? 0) : 0;
  }
}
