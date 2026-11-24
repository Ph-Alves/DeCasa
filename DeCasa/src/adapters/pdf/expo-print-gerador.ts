import { File, Paths } from 'expo-file-system';
import { printAsync, printToFileAsync } from 'expo-print';

import type { GeradorDePdf, LivroParaExportar, MidiaStorage } from '../../application/ports/plataforma.ts';
import { A4, htmlDoLivro } from './modelo-html.ts';

/** RF14 com expo-print (HTML → PDF, no aparelho e sem internet). */
export class ExpoPrintGeradorDePdf implements GeradorDePdf {
  private readonly midias: MidiaStorage;

  constructor(midias: MidiaStorage) {
    this.midias = midias;
  }

  async gerar(livro: LivroParaExportar, opts: { incluirFotos: boolean }): Promise<string> {
    // O gerador não abre file://: as fotos vão embutidas em base64, e só se a pessoa escolheu (RF14).
    const fotos = new Map<string, string>();
    if (opts.incluirFotos) {
      for (const m of livro.receitas.flatMap((r) => r.midias).filter((m) => m.tipo === 'foto')) {
        const arquivo = new File(this.midias.uri(m.caminhoLocal));
        if (arquivo.exists) fotos.set(m.caminhoLocal, `data:image/jpeg;base64,${await arquivo.base64()}`);
      }
    }

    const { uri } = await printToFileAsync({
      html: htmlDoLivro(livro, (caminho) => fotos.get(caminho) ?? null),
      width: A4.largura,
      height: A4.altura,
    });

    // Quem recebe vê "Livro da Família.pdf", não um nome aleatório.
    const nome = `${livro.nome.replace(/[\\/:*?"<>|]/g, '').trim() || 'Livro'}.pdf`;
    const destino = new File(Paths.cache, nome);
    if (destino.exists) destino.delete();
    await new File(uri).move(destino);
    return destino.uri;
  }

  async imprimir(pdfUri: string): Promise<void> {
    await printAsync({ uri: pdfUri });
  }
}
