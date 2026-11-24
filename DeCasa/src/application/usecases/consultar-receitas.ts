import { correspondeBusca, type Livro, type Receita } from '../../domain/receita/receita.ts';
import type { LivroRepository, ReceitaRepository } from '../ports/repositorios.ts';

/** RF01, RF02, RF09. */
export class ConsultarReceitas {
  private readonly receitas: ReceitaRepository;
  private readonly livros: LivroRepository;

  constructor(deps: { receitas: ReceitaRepository; livro: LivroRepository }) {
    this.receitas = deps.receitas;
    this.livros = deps.livro;
  }

  /** Nome do livro para o cabeçalho (RN01). */
  livro(): Promise<Livro> {
    return this.livros.obter();
  }

  /** Mais recentes primeiro. */
  async listar(): Promise<Receita[]> {
    return (await this.receitas.listar()).sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }

  /** shortcut: filtra em memória porque o LIKE do SQLite não ignora acento; trocar por coluna normalizada se passar de 300 ms com 200 receitas (RNF04). */
  async buscar(termo: string): Promise<Receita[]> {
    return (await this.listar()).filter((r) => correspondeBusca(r, termo));
  }

  ver(id: string): Promise<Receita | null> {
    return this.receitas.obter(id);
  }
}
