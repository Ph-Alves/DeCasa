import type { ReceitaRepository } from '../../application/ports/repositorios.ts';
import type { Ingrediente, Midia, Origem, Passo, Receita } from '../../domain/receita/receita.ts';
import type { Banco } from './banco.ts';

type LinhaReceita = {
  id: string; titulo: string; autor_nome: string | null; rendimento_porcoes: number | null;
  ponto_obs: string | null; quando_faz: string | null; origem: Origem; criado_em: number; atualizado_em: number;
};
type LinhaIngrediente = {
  id: string; receita_id: string; quantidade_num: number | null; quantidade_texto: string;
  unidade: string | null; nome: string; observacao: string | null;
};
type LinhaPasso = { id: string; receita_id: string; texto: string };
type LinhaMidia = {
  id: string; receita_id: string; tipo: Midia['tipo']; caminho_local: string; duracao_s: number | null;
  tamanho_bytes: number | null; transcricao_texto: string | null; criado_em: number;
};

export class SqliteReceitaRepository implements ReceitaRepository {
  private readonly banco: Banco;

  constructor(banco: Banco) {
    this.banco = banco;
  }

  listar(): Promise<Receita[]> {
    return this.carregar('', []);
  }

  async obter(id: string): Promise<Receita | null> {
    return (await this.carregar('WHERE receita_id = ?', [id], 'WHERE id = ?'))[0] ?? null;
  }

  /** Receita e filhos numa transação: ou grava tudo ou nada (RNF08). */
  async salvar(r: Receita): Promise<void> {
    await this.banco.withExclusiveTransactionAsync(async (txn) => {
      // UPSERT em vez de REPLACE: REPLACE apagaria a linha e dispararia a cascata.
      await txn.runAsync(
        `INSERT INTO receita (id, titulo, autor_nome, rendimento_porcoes, ponto_obs, quando_faz, origem, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           titulo = excluded.titulo, autor_nome = excluded.autor_nome, rendimento_porcoes = excluded.rendimento_porcoes,
           ponto_obs = excluded.ponto_obs, quando_faz = excluded.quando_faz, origem = excluded.origem,
           atualizado_em = excluded.atualizado_em`,
        [r.id, r.titulo, r.autorNome, r.rendimentoPorcoes, r.pontoObs, r.quandoFaz, r.origem, r.criadoEm.getTime(), r.atualizadoEm.getTime()],
      );
      for (const tabela of ['ingrediente', 'passo', 'midia']) {
        await txn.runAsync(`DELETE FROM ${tabela} WHERE receita_id = ?`, [r.id]);
      }
      for (const [ordem, i] of r.ingredientes.entries()) {
        await txn.runAsync(
          `INSERT INTO ingrediente (id, receita_id, ordem, quantidade_num, quantidade_texto, unidade, nome, observacao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [i.id, r.id, ordem, i.quantidade.valor, i.quantidade.texto, i.unidade, i.nome, i.observacao],
        );
      }
      for (const [ordem, p] of r.passos.entries()) {
        await txn.runAsync('INSERT INTO passo (id, receita_id, ordem, texto) VALUES (?, ?, ?, ?)', [p.id, r.id, ordem, p.texto]);
      }
      for (const [ordem, m] of r.midias.entries()) {
        await txn.runAsync(
          `INSERT INTO midia (id, receita_id, ordem, tipo, caminho_local, duracao_s, tamanho_bytes, transcricao_texto, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.id, r.id, ordem, m.tipo, m.caminhoLocal, m.duracaoS, m.tamanhoBytes, m.transcricao, m.criadoEm.getTime()],
        );
      }
    });
  }

  async excluir(id: string): Promise<void> {
    await this.banco.runAsync('DELETE FROM receita WHERE id = ?', [id]);
  }

  /** 4 consultas no total, não uma por receita: o livro com 200 receitas abre rápido (RNF04). */
  private async carregar(filtroFilhos: string, params: string[], filtroReceita = filtroFilhos): Promise<Receita[]> {
    const [receitas, ingredientes, passos, midias] = await Promise.all([
      this.banco.getAllAsync<LinhaReceita>(`SELECT * FROM receita ${filtroReceita}`, params),
      this.banco.getAllAsync<LinhaIngrediente>(`SELECT * FROM ingrediente ${filtroFilhos} ORDER BY ordem`, params),
      this.banco.getAllAsync<LinhaPasso>(`SELECT * FROM passo ${filtroFilhos} ORDER BY ordem`, params),
      this.banco.getAllAsync<LinhaMidia>(`SELECT * FROM midia ${filtroFilhos} ORDER BY ordem`, params),
    ]);
    const ings = agrupar(ingredientes, paraIngrediente);
    const pas = agrupar(passos, (l): Passo => ({ id: l.id, texto: l.texto }));
    const mids = agrupar(midias, paraMidia);
    return receitas.map((l) => ({
      id: l.id,
      titulo: l.titulo,
      autorNome: l.autor_nome,
      rendimentoPorcoes: l.rendimento_porcoes,
      pontoObs: l.ponto_obs,
      quandoFaz: l.quando_faz,
      origem: l.origem,
      ingredientes: ings.get(l.id) ?? [],
      passos: pas.get(l.id) ?? [],
      midias: mids.get(l.id) ?? [],
      criadoEm: new Date(l.criado_em),
      atualizadoEm: new Date(l.atualizado_em),
    }));
  }
}

function agrupar<L extends { receita_id: string }, T>(linhas: L[], mapear: (l: L) => T): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const l of linhas) {
    const lista = grupos.get(l.receita_id) ?? [];
    lista.push(mapear(l));
    grupos.set(l.receita_id, lista);
  }
  return grupos;
}

function paraIngrediente(l: LinhaIngrediente): Ingrediente {
  return {
    id: l.id,
    quantidade: { valor: l.quantidade_num, texto: l.quantidade_texto },
    unidade: l.unidade,
    nome: l.nome,
    observacao: l.observacao,
  };
}

function paraMidia(l: LinhaMidia): Midia {
  return {
    id: l.id,
    tipo: l.tipo,
    caminhoLocal: l.caminho_local,
    duracaoS: l.duracao_s,
    tamanhoBytes: l.tamanho_bytes,
    transcricao: l.transcricao_texto,
    criadoEm: new Date(l.criado_em),
  };
}
