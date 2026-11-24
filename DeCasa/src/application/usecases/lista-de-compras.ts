import { consolidarItens, type ItemCompra } from '../../domain/compras/item-compra.ts';
import { escalar } from '../../domain/porcoes/escalar.ts';
import { formatarQuantidade } from '../../domain/receita/quantidade.ts';
import type { Receita } from '../../domain/receita/receita.ts';
import type { Compartilhador, IdGenerator } from '../ports/plataforma.ts';
import type { ListaComprasRepository } from '../ports/repositorios.ts';

type Deps = { itens: ListaComprasRepository; compartilhador: Compartilhador; ids: IdGenerator };

/** RF13. Toda alteração devolve a lista nova, já consolidada (RN04). */
export class ListaDeCompras {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  listar(): Promise<ItemCompra[]> {
    return this.d.itens.listar();
  }

  /**
   * Com a escala escolhida na tela (RF12), sem alterar a receita.
   * Sem rendimento informado, `porcoes` é quantas vezes a receita (base 1).
   */
  async adicionarReceita(receita: Receita, porcoes?: number): Promise<ItemCompra[]> {
    const ingredientes = porcoes ? escalar(receita.ingredientes, receita.rendimentoPorcoes ?? 1, porcoes) : receita.ingredientes;
    const novos = ingredientes.map((i) => this.novoItem(i.nome, i.quantidade.valor, i.unidade, receita.id));
    return this.gravar([...(await this.listar()), ...novos]);
  }

  async adicionarItem(nome: string, quantidade: number | null = null, unidade: string | null = null): Promise<ItemCompra[]> {
    if (!nome.trim()) return this.listar();
    return this.gravar([...(await this.listar()), this.novoItem(nome.trim(), quantidade, unidade, null)]);
  }

  async marcar(id: string, comprado: boolean): Promise<ItemCompra[]> {
    return this.gravar((await this.listar()).map((i) => (i.id === id ? { ...i, comprado } : i)));
  }

  async remover(id: string): Promise<ItemCompra[]> {
    return this.gravar((await this.listar()).filter((i) => i.id !== id));
  }

  async limpar(): Promise<ItemCompra[]> {
    return this.gravar([]);
  }

  async compartilhar(): Promise<void> {
    await this.d.compartilhador.compartilharTexto(textoDaLista(await this.listar()));
  }

  private novoItem(nome: string, quantidade: number | null, unidade: string | null, receitaOrigemId: string | null): ItemCompra {
    return { id: this.d.ids.novo(), nome, quantidade, unidade, comprado: false, receitaOrigemId };
  }

  private async gravar(itens: ItemCompra[]): Promise<ItemCompra[]> {
    const lista = consolidarItens(itens);
    await this.d.itens.substituir(lista);
    return lista;
  }
}

/** Texto para a folha de compartilhamento (WhatsApp, notas...). */
export function textoDaLista(itens: ItemCompra[]): string {
  return ['Lista de compras', '', ...itens.map((i) => `${i.comprado ? '✓' : '•'} ${textoDoItem(i)}`)].join('\n');
}

/** "2 xícaras de fubá", "3 ovos", "sal". */
export function textoDoItem(i: ItemCompra): string {
  const numero = i.quantidade === null ? '' : formatarQuantidade(i.quantidade);
  if (i.unidade) return `${[numero, i.unidade].filter(Boolean).join(' ')} de ${i.nome}`;
  return numero ? `${numero} ${i.nome}` : i.nome;
}
