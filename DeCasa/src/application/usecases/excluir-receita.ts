import type { MidiaStorage } from '../ports/plataforma.ts';
import type { ReceitaRepository } from '../ports/repositorios.ts';
import { apagarArquivos } from './apagar-arquivos.ts';

/** RF10: remove a receita e seus arquivos (a confirmação é da tela). */
export class ExcluirReceita {
  private readonly d: { receitas: ReceitaRepository; midias: MidiaStorage };

  constructor(deps: { receitas: ReceitaRepository; midias: MidiaStorage }) {
    this.d = deps;
  }

  async executar(id: string): Promise<void> {
    const receita = await this.d.receitas.obter(id);
    if (!receita) return;
    await this.d.receitas.excluir(id);
    await apagarArquivos(this.d.midias, receita.midias);
  }
}
