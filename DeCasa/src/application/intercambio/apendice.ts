import { rascunhoVazio, type Ingrediente, type Rascunho, type Receita } from '../../domain/receita/receita.ts';

/**
 * Apêndice "Dados para importação" do PDF (RF14, RF15, arquitetura 5.4).
 * O JSON das receitas vira base64 em linhas `DC1|003/012|<dados>|<checksum>`, que sobrevivem
 * à extração de texto do PDF. Hipótese a validar no spike S3.
 */

const PREFIXO = 'DC1';
const CARACTERES_POR_LINHA = 64;
const LINHA = /DC1\|(\d+)\/(\d+)\|([A-Za-z0-9+/=]+)\|([0-9a-f]{8})/g;

// Limites contra arquivo malicioso ou gigante (RNF09).
const MAX_TEXTO = 5_000_000;
const MAX_RECEITAS = 1000;
const MAX_ITENS = 200;
const MAX_CAMPO = 2000;

/** FNV-1a de 32 bits: só detecta linha corrompida, não é segurança. */
function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function codificarApendice(receitas: Receita[]): string[] {
  // Só texto da receita: caminhos de mídia e ids locais não saem do aparelho (RN05).
  const dados = {
    v: 1,
    receitas: receitas.map((r) => ({
      titulo: r.titulo, autorNome: r.autorNome, rendimentoPorcoes: r.rendimentoPorcoes,
      pontoObs: r.pontoObs, quandoFaz: r.quandoFaz,
      ingredientes: r.ingredientes.map(({ id: _id, ...i }) => i),
      passos: r.passos.map((p) => p.texto),
    })),
  };
  // btoa só aceita ASCII: acentos viram \uXXXX dentro do próprio JSON.
  const ascii = JSON.stringify(dados).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const partes = btoa(ascii).match(new RegExp(`.{1,${CARACTERES_POR_LINHA}}`, 'g')) ?? [];
  const pad = (n: number) => String(n).padStart(3, '0');
  return partes.map((p, i) => `${PREFIXO}|${pad(i + 1)}/${pad(partes.length)}|${p}|${checksum(p)}`);
}

/** Tira as linhas do apêndice de um texto, para o parser não tropeçar nelas. */
export function removerApendice(texto: string): string {
  return texto.replace(LINHA, '');
}

/**
 * Recupera as receitas do apêndice. Devolve null se não houver apêndice ou se estiver
 * incompleto ou corrompido (aí a importação cai no parser). Receitas malformadas são descartadas.
 */
export function decodificarApendice(texto: string): Rascunho[] | null {
  if (texto.length > MAX_TEXTO) return null;
  const linhas = [...texto.matchAll(LINHA)];
  if (!linhas.length) return null;

  const total = Number(linhas[0][2]);
  const partes = new Map<number, string>();
  for (const [, n, t, dados, soma] of linhas) {
    if (Number(t) === total && checksum(dados) === soma) partes.set(Number(n), dados);
  }
  if (partes.size !== total) return null;

  let json: unknown;
  try {
    const base64 = Array.from({ length: total }, (_, i) => partes.get(i + 1)).join('');
    json = JSON.parse(atob(base64));
  } catch {
    return null;
  }
  if (!ehObjeto(json) || json.v !== 1 || !Array.isArray(json.receitas)) return null;
  return json.receitas.slice(0, MAX_RECEITAS).flatMap((r) => lerReceita(r) ?? []);
}

function ehObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.slice(0, MAX_CAMPO) : null;
}

function lerReceita(x: unknown): Rascunho | null {
  if (!ehObjeto(x)) return null;
  const titulo = texto(x.titulo);
  if (!titulo) return null;
  const rendimento = x.rendimentoPorcoes;
  return {
    ...rascunhoVazio('pdf'),
    titulo,
    autorNome: texto(x.autorNome),
    rendimentoPorcoes: Number.isInteger(rendimento) && (rendimento as number) > 0 ? (rendimento as number) : null,
    pontoObs: texto(x.pontoObs),
    quandoFaz: texto(x.quandoFaz),
    ingredientes: (Array.isArray(x.ingredientes) ? x.ingredientes : []).slice(0, MAX_ITENS).flatMap((i) => lerIngrediente(i) ?? []),
    passos: (Array.isArray(x.passos) ? x.passos : []).slice(0, MAX_ITENS).flatMap((p) => texto(p) ?? []),
  };
}

function lerIngrediente(x: unknown): Omit<Ingrediente, 'id'> | null {
  if (!ehObjeto(x) || !ehObjeto(x.quantidade)) return null;
  const nome = texto(x.nome);
  if (!nome) return null;
  const valor = x.quantidade.valor;
  return {
    quantidade: {
      valor: typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null,
      texto: texto(x.quantidade.texto) ?? '',
    },
    unidade: texto(x.unidade),
    nome,
    observacao: texto(x.observacao),
  };
}
