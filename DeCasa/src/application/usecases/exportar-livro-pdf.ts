import { NOME_PADRAO_DO_LIVRO } from '../../domain/receita/receita.ts';
import { codificarApendice } from '../intercambio/apendice.ts';
import type { Compartilhador, GeradorDePdf } from '../ports/plataforma.ts';
import type { LivroRepository, ReceitaRepository } from '../ports/repositorios.ts';

type Deps = { receitas: ReceitaRepository; livro: LivroRepository; gerador: GeradorDePdf; compartilhador: Compartilhador };

/** RF14: gera o PDF (com o apêndice de dados para importação) e depois imprime ou compartilha. */
export class ExportarLivroPdf {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  /** Devolve a uri do PDF. O nome alterado na tela fica salvo no livro. */
  async gerar(opts: { receitaIds: string[]; incluirFotos: boolean; nomeDoLivro: string }): Promise<string> {
    if (!opts.receitaIds.length) throw new Error('Escolha pelo menos uma receita.');
    const nome = opts.nomeDoLivro.trim() || NOME_PADRAO_DO_LIVRO;
    if ((await this.d.livro.obter()).nome !== nome) await this.d.livro.renomear(nome);

    const receitas = (await this.d.receitas.listar()).filter((r) => opts.receitaIds.includes(r.id));
    return this.d.gerador.gerar({ nome, receitas, apendice: codificarApendice(receitas) }, { incluirFotos: opts.incluirFotos });
  }

  compartilhar(pdfUri: string): Promise<void> {
    return this.d.compartilhador.compartilharArquivo(pdfUri);
  }

  imprimir(pdfUri: string): Promise<void> {
    return this.d.gerador.imprimir(pdfUri);
  }
}
