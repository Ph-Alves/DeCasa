import { validarRascunho, type Rascunho, type Receita } from '../../domain/receita/receita.ts';
import type { IdGenerator, MidiaStorage, Relogio } from '../ports/plataforma.ts';
import type { ReceitaRepository } from '../ports/repositorios.ts';
import { apagarArquivos } from './apagar-arquivos.ts';

export type ResultadoSalvar = { ok: true; receita: Receita } | { ok: false; erros: string[] };

type Deps = { receitas: ReceitaRepository; midias: MidiaStorage; ids: IdGenerator; relogio: Relogio };

/**
 * RN02: o ÚNICO caso de uso que grava receita. Serve para cadastro novo, edição (RF10)
 * e importação (RF15). Não mexe no rascunho guardado: isso é do GerenciarRascunho.
 */
export class SalvarReceitaRevisada {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  async executar(rascunho: Rascunho): Promise<ResultadoSalvar> {
    const erros = validarRascunho(rascunho);
    if (erros.length) return { ok: false, erros };

    const existente = rascunho.receitaId ? await this.d.receitas.obter(rascunho.receitaId) : null;
    const agora = this.d.relogio.agora();
    const receita: Receita = {
      id: existente?.id ?? this.d.ids.novo(),
      titulo: rascunho.titulo.trim(),
      autorNome: semVazio(rascunho.autorNome),
      rendimentoPorcoes: rascunho.rendimentoPorcoes,
      pontoObs: semVazio(rascunho.pontoObs),
      quandoFaz: semVazio(rascunho.quandoFaz),
      origem: existente?.origem ?? rascunho.origem,
      ingredientes: rascunho.ingredientes
        .filter((i) => i.nome.trim())
        .map((i) => ({ ...i, nome: i.nome.trim(), id: this.d.ids.novo() })),
      passos: rascunho.passos
        .map((p) => p.trim())
        .filter(Boolean)
        .map((texto) => ({ id: this.d.ids.novo(), texto })),
      midias: rascunho.midias,
      criadoEm: existente?.criadoEm ?? agora,
      atualizadoEm: agora,
    };

    await this.d.receitas.salvar(receita);
    if (existente) {
      const removidas = existente.midias.filter((m) => !receita.midias.some((n) => n.id === m.id));
      await apagarArquivos(this.d.midias, removidas);
    }
    return { ok: true, receita };
  }
}

function semVazio(texto: string | null): string | null {
  return texto?.trim() || null;
}
