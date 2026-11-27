import type { Midia, Rascunho } from '../../domain/receita/receita.ts';
import type { MidiaStorage } from '../ports/plataforma.ts';
import type { RascunhoRepository, ReceitaRepository } from '../ports/repositorios.ts';
import { apagarArquivos } from './apagar-arquivos.ts';

type Deps = { rascunhos: RascunhoRepository; receitas: ReceitaRepository; midias: MidiaStorage };

/** RF03 e RF08: rascunho que sobrevive a fechar o app (RNF08). */
export class GerenciarRascunho {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  guardar(rascunho: Rascunho): Promise<void> {
    return this.d.rascunhos.salvar(rascunho);
  }

  recuperar(): Promise<Rascunho | null> {
    return this.d.rascunhos.recuperar();
  }

  /** Depois de "Salvar no livro": o rascunho some e os arquivos ficam com a receita. */
  concluir(): Promise<void> {
    return this.d.rascunhos.limpar();
  }

  /** O usuário desistiu: some o rascunho e as mídias que não pertencem a uma receita salva. */
  async descartar(rascunho: Rascunho): Promise<void> {
    const orfas = await this.semReceitaSalva(rascunho, rascunho.midias);
    await this.d.rascunhos.limpar();
    await apagarArquivos(this.d.midias, orfas);
  }

  /**
   * RF05 e RF10: troca a foto do rascunho, ou tira com `nova` null.
   * A antiga só sai do aparelho se não for de uma receita salva; a da receita sai ao salvar a edição.
   */
  async trocarFoto(rascunho: Rascunho, nova: Midia | null): Promise<Rascunho> {
    const antigas = rascunho.midias.filter((m) => m.tipo === 'foto');
    const atualizado = { ...rascunho, midias: [...rascunho.midias.filter((m) => m.tipo !== 'foto'), ...(nova ? [nova] : [])] };
    await this.d.rascunhos.salvar(atualizado);
    await apagarArquivos(this.d.midias, await this.semReceitaSalva(rascunho, antigas));
    return atualizado;
  }

  private async semReceitaSalva(rascunho: Rascunho, midias: Midia[]): Promise<Midia[]> {
    const salva = rascunho.receitaId ? await this.d.receitas.obter(rascunho.receitaId) : null;
    return midias.filter((m) => !salva?.midias.some((s) => s.id === m.id));
  }
}
