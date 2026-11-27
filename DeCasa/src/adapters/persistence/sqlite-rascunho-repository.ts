import type { RascunhoRepository } from '../../application/ports/repositorios.ts';
import type { Rascunho } from '../../domain/receita/receita.ts';
import type { Banco } from './banco.ts';

export class SqliteRascunhoRepository implements RascunhoRepository {
  private readonly banco: Banco;

  constructor(banco: Banco) {
    this.banco = banco;
  }

  async salvar(rascunho: Rascunho): Promise<void> {
    await this.banco.runAsync(
      `INSERT INTO rascunho (id, payload_json, atualizado_em) VALUES (1, ?, ?)
       ON CONFLICT (id) DO UPDATE SET payload_json = excluded.payload_json, atualizado_em = excluded.atualizado_em`,
      [JSON.stringify(rascunho), Date.now()],
    );
  }

  async recuperar(): Promise<Rascunho | null> {
    const linha = await this.banco.getFirstAsync<{ payload_json: string }>('SELECT payload_json FROM rascunho WHERE id = 1', []);
    if (!linha) return null;
    try {
      const r = JSON.parse(linha.payload_json) as Rascunho;
      // No JSON as datas viram texto.
      return { ...r, midias: r.midias.map((m) => ({ ...m, criadoEm: new Date(m.criadoEm) })) };
    } catch {
      // Rascunho ilegível não pode travar a abertura do app; os arquivos dele ficam órfãos.
      return null;
    }
  }

  async limpar(): Promise<void> {
    await this.banco.runAsync('DELETE FROM rascunho', []);
  }
}
