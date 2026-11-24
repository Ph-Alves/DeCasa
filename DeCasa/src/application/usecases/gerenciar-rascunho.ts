import type { Rascunho } from '../../domain/receita/receita.ts';
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
    const salva = rascunho.receitaId ? await this.d.receitas.obter(rascunho.receitaId) : null;
    const orfas = rascunho.midias.filter((m) => !salva?.midias.some((s) => s.id === m.id));
    await this.d.rascunhos.limpar();
    await apagarArquivos(this.d.midias, orfas);
  }
}
