import { formatarQuantidade, type Quantidade } from '../receita/quantidade.ts';

/**
 * RF12: recalcula as quantidades de `de` para `para` porções. Não altera a entrada.
 * Quantidades sem valor ("a gosto") ficam iguais (RN03).
 * shortcut: a unidade não vai para o plural ("1 xícara" vira "2 xícara"); tratar na apresentação se incomodar.
 */
export function escalar<T extends { quantidade: Quantidade }>(ingredientes: T[], de: number, para: number): T[] {
  if (!(de > 0 && para > 0 && Number.isFinite(de) && Number.isFinite(para))) {
    throw new RangeError('Porções precisam ser números maiores que zero.');
  }
  const fator = para / de;
  return ingredientes.map((i) => {
    if (i.quantidade.valor === null) return i;
    const valor = i.quantidade.valor * fator;
    return { ...i, quantidade: { valor, texto: formatarQuantidade(valor) } };
  });
}
