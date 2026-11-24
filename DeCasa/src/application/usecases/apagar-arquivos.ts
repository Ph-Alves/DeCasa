import type { Midia } from '../../domain/receita/receita.ts';
import type { MidiaStorage } from '../ports/plataforma.ts';

/** Sempre chamado depois do banco: um arquivo órfão é melhor que uma receita apontando para arquivo apagado. */
export async function apagarArquivos(storage: MidiaStorage, midias: Midia[]): Promise<void> {
  await Promise.allSettled(midias.map((m) => storage.apagar(m.caminhoLocal)));
}
