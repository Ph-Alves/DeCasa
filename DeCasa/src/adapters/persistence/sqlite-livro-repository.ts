import type { LivroRepository } from '../../application/ports/repositorios.ts';
import type { Livro } from '../../domain/receita/receita.ts';
import type { Banco } from './banco.ts';

/** O livro único (RN01) é criado pela primeira migração. */
export class SqliteLivroRepository implements LivroRepository {
  private readonly banco: Banco;

  constructor(banco: Banco) {
    this.banco = banco;
  }

  async obter(): Promise<Livro> {
    const l = await this.banco.getFirstAsync<{ id: string; nome: string; criado_em: number }>('SELECT * FROM livro LIMIT 1', []);
    if (!l) throw new Error('Livro não encontrado: o banco não foi migrado.');
    return { id: l.id, nome: l.nome, criadoEm: new Date(l.criado_em) };
  }

  async renomear(nome: string): Promise<void> {
    await this.banco.runAsync('UPDATE livro SET nome = ?', [nome]);
  }
}
