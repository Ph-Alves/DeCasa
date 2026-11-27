import type { ListaComprasRepository } from '../../application/ports/repositorios.ts';
import type { ItemCompra } from '../../domain/compras/item-compra.ts';
import type { Banco } from './banco.ts';

type LinhaItem = {
  id: string; nome: string; quantidade_num: number | null; unidade: string | null;
  comprado: number; receita_origem_id: string | null;
};

export class SqliteListaComprasRepository implements ListaComprasRepository {
  private readonly banco: Banco;

  constructor(banco: Banco) {
    this.banco = banco;
  }

  async listar(): Promise<ItemCompra[]> {
    const linhas = await this.banco.getAllAsync<LinhaItem>('SELECT * FROM item_compra ORDER BY ordem', []);
    return linhas.map((l) => ({
      id: l.id,
      nome: l.nome,
      quantidade: l.quantidade_num,
      unidade: l.unidade,
      comprado: l.comprado === 1,
      receitaOrigemId: l.receita_origem_id,
    }));
  }

  async substituir(itens: ItemCompra[]): Promise<void> {
    await this.banco.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM item_compra', []);
      for (const [ordem, i] of itens.entries()) {
        await txn.runAsync(
          `INSERT INTO item_compra (id, ordem, nome, quantidade_num, unidade, comprado, receita_origem_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [i.id, ordem, i.nome, i.quantidade, i.unidade, i.comprado ? 1 : 0, i.receitaOrigemId],
        );
      }
    });
  }
}
