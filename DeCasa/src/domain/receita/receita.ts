import { normalizar } from '../texto.ts';
import type { Quantidade } from './quantidade.ts';

export type Origem = 'texto' | 'voz' | 'foto' | 'pdf';

export type Ingrediente = {
  id: string;
  quantidade: Quantidade;
  unidade: string | null;
  nome: string;
  observacao: string | null;
};

export type Passo = { id: string; texto: string };

export type Midia = {
  id: string;
  tipo: 'audio' | 'foto';
  caminhoLocal: string;
  duracaoS: number | null;
  tamanhoBytes: number | null;
  transcricao: string | null;
  criadoEm: Date;
};

/** Ordem de ingredientes e passos = posição no array. */
export type Receita = {
  id: string;
  titulo: string;
  autorNome: string | null; // "quem ensinou"
  rendimentoPorcoes: number | null;
  pontoObs: string | null; // "ponto da massa"
  quandoFaz: string | null;
  origem: Origem;
  ingredientes: Ingrediente[];
  passos: Passo[];
  midias: Midia[];
  criadoEm: Date;
  atualizadoEm: Date;
};

/** Receita em revisão (RF08): ainda sem ids nem datas. Só vira Receita ao salvar (RN02). */
export type Rascunho = {
  titulo: string;
  autorNome: string | null;
  rendimentoPorcoes: number | null;
  pontoObs: string | null;
  quandoFaz: string | null;
  origem: Origem;
  ingredientes: Omit<Ingrediente, 'id'>[];
  passos: string[];
  naoClassificado: string[]; // linhas que o parser não soube classificar (RF07)
  midias: Midia[];
};

/** RN01: um livro só por aparelho. */
export type Livro = { id: string; nome: string; criadoEm: Date };
export const NOME_PADRAO_DO_LIVRO = 'Livro da Família';

export function rascunhoVazio(origem: Origem): Rascunho {
  return {
    titulo: '', autorNome: null, rendimentoPorcoes: null, pontoObs: null, quandoFaz: null,
    origem, ingredientes: [], passos: [], naoClassificado: [], midias: [],
  };
}

/** RF03: título, 1 ingrediente e 1 passo. Lista vazia = válido. Mensagens prontas para a tela. */
export function validarRascunho(r: Rascunho): string[] {
  const erros: string[] = [];
  if (!r.titulo.trim()) erros.push('Dê um nome para a receita.');
  if (!r.ingredientes.some((i) => i.nome.trim())) erros.push('Coloque pelo menos 1 ingrediente.');
  if (!r.passos.some((p) => p.trim())) erros.push('Coloque pelo menos 1 passo.');
  if (r.rendimentoPorcoes !== null && !(Number.isInteger(r.rendimentoPorcoes) && r.rendimentoPorcoes > 0)) {
    erros.push('O rendimento precisa ser um número inteiro maior que zero.');
  }
  return erros;
}

/** RF16: mesmo título e mesmo autor, ignorando maiúsculas e acentos. */
export function ehPossivelDuplicata(
  a: Pick<Receita, 'titulo' | 'autorNome'>,
  b: Pick<Receita, 'titulo' | 'autorNome'>,
): boolean {
  return normalizar(a.titulo) === normalizar(b.titulo) && normalizar(a.autorNome ?? '') === normalizar(b.autorNome ?? '');
}

/** RF02: título, autor ou ingrediente, ignorando maiúsculas e acentos. */
export function correspondeBusca(receita: Receita, termo: string): boolean {
  const t = normalizar(termo);
  if (!t) return true;
  return [receita.titulo, receita.autorNome ?? '', ...receita.ingredientes.map((i) => i.nome)]
    .some((campo) => normalizar(campo).includes(t));
}
