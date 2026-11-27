import type { ItemCompra } from '../../domain/compras/item-compra.ts';
import type { Livro, Rascunho, Receita } from '../../domain/receita/receita.ts';

export interface ReceitaRepository {
  /** Todas as receitas, completas. A busca (RF02) é feita em memória pelo caso de uso. */
  listar(): Promise<Receita[]>;
  obter(id: string): Promise<Receita | null>;
  /** Insere ou substitui a receita inteira (ingredientes, passos e mídias) numa transação (RNF08). */
  salvar(receita: Receita): Promise<void>;
  /** Apaga a receita e, em cascata, ingredientes, passos e registros de mídia. Os arquivos ficam com o MidiaStorage. */
  excluir(id: string): Promise<void>;
}

/** Um rascunho só por vez (RF03: recuperar o cadastro interrompido). */
export interface RascunhoRepository {
  salvar(rascunho: Rascunho): Promise<void>;
  recuperar(): Promise<Rascunho | null>;
  limpar(): Promise<void>;
}

export interface ListaComprasRepository {
  listar(): Promise<ItemCompra[]>;
  /** Grava a lista inteira numa transação. */
  substituir(itens: ItemCompra[]): Promise<void>;
}

/** RN01: o adapter cria o livro único no primeiro uso. */
export interface LivroRepository {
  obter(): Promise<Livro>;
  renomear(nome: string): Promise<void>;
}
