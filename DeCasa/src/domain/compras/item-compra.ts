import { chaveDaUnidade, unidadeConcordante } from '../receita/unidade.ts';
import { normalizar } from '../texto.ts';

export type ItemCompra = {
  id: string;
  nome: string;
  quantidade: number | null; // null = sem quantidade ("a gosto")
  unidade: string | null;
  comprado: boolean;
  receitaOrigemId: string | null;
};

/**
 * RN04: soma itens com mesmo nome e mesma unidade (normalizados); unidades diferentes ficam separadas.
 * O item somado mantém id e origem do primeiro e só fica "comprado" se todos estavam.
 */
export function consolidarItens(itens: ItemCompra[]): ItemCompra[] {
  const porChave = new Map<string, ItemCompra>();
  for (const item of itens) {
    const chave = `${normalizar(item.nome)}|${chaveDaUnidade(item.unidade)}`;
    const atual = porChave.get(chave);
    if (!atual) {
      porChave.set(chave, { ...item });
      continue;
    }
    if (item.quantidade !== null) atual.quantidade = (atual.quantidade ?? 0) + item.quantidade;
    atual.unidade = unidadeConcordante(atual.unidade, atual.quantidade);
    atual.comprado = atual.comprado && item.comprado;
  }
  return [...porChave.values()];
}
