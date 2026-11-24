/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { SalvarReceitaRevisada } from '../../application/usecases/salvar-receita-revisada.ts';
import { rascunhoVazio, type Midia, type Receita } from '../../domain/receita/receita.ts';
import type { Banco, ValorSql } from './banco.ts';
import { migrar } from './migracoes.ts';
import { SqliteListaComprasRepository } from './sqlite-lista-compras-repository.ts';
import { SqliteLivroRepository } from './sqlite-livro-repository.ts';
import { SqliteRascunhoRepository } from './sqlite-rascunho-repository.ts';
import { SqliteReceitaRepository } from './sqlite-receita-repository.ts';

/** O mesmo contrato do expo-sqlite, sobre o SQLite embutido no Node: o SQL roda de verdade. */
function bancoEmMemoria(): Banco & { contar(tabela: string): number } {
  const db = new DatabaseSync(':memory:');
  const p = (params: ValorSql[]) => params as SQLInputValue[];
  const banco = {
    execAsync: async (sql: string) => db.exec(sql),
    runAsync: async (sql: string, params: ValorSql[]) => db.prepare(sql).run(...p(params)),
    getAllAsync: async <T,>(sql: string, params: ValorSql[]) => db.prepare(sql).all(...p(params)) as T[],
    getFirstAsync: async <T,>(sql: string, params: ValorSql[]) => (db.prepare(sql).get(...p(params)) as T | undefined) ?? null,
    withExclusiveTransactionAsync: async (task: (txn: Banco) => Promise<void>) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        await task(banco);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    contar: (tabela: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n,
  };
  return banco;
}

async function montar() {
  const banco = bancoEmMemoria();
  await migrar(banco);
  return {
    banco,
    receitas: new SqliteReceitaRepository(banco),
    rascunhos: new SqliteRascunhoRepository(banco),
    lista: new SqliteListaComprasRepository(banco),
    livro: new SqliteLivroRepository(banco),
  };
}

const midia = (id: string, tipo: Midia['tipo'] = 'audio'): Midia => ({
  id, tipo, caminhoLocal: `file:///app/${id}`, duracaoS: tipo === 'audio' ? 12.5 : null, tamanhoBytes: 2048,
  transcricao: tipo === 'audio' ? 'bate tudo' : null, criadoEm: new Date(1_700_000_000_000),
});

function receita(id = 'r1', titulo = 'Bolo de fubá'): Receita {
  return {
    id, titulo, autorNome: 'Vó Lurdes', rendimentoPorcoes: 8, pontoObs: 'até dar o ponto', quandoFaz: null, origem: 'voz',
    ingredientes: [
      { id: `${id}-i1`, quantidade: { valor: 2, texto: '2' }, unidade: 'xícaras', nome: 'fubá', observacao: null },
      { id: `${id}-i2`, quantidade: { valor: 0.5, texto: '1/2' }, unidade: 'xícara', nome: 'óleo', observacao: 'de milho' },
      { id: `${id}-i3`, quantidade: { valor: null, texto: 'a gosto' }, unidade: null, nome: 'sal', observacao: null },
    ],
    passos: [{ id: `${id}-p1`, texto: 'Bata tudo.' }, { id: `${id}-p2`, texto: 'Asse por 40 minutos.' }],
    midias: [midia(`${id}-a1`), midia(`${id}-f1`, 'foto')],
    criadoEm: new Date(1_700_000_000_000),
    atualizadoEm: new Date(1_700_000_100_000),
  };
}

test('migrar cria o esquema e o livro único, e rodar de novo não faz nada (RN01)', async () => {
  const { banco, livro } = await montar();
  await migrar(banco);
  assert.equal((await banco.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version, 1);
  assert.equal(banco.contar('livro'), 1);
  assert.equal((await livro.obter()).nome, 'Livro da Família');
  await livro.renomear('Receitas da Família Silva');
  assert.equal((await livro.obter()).nome, 'Receitas da Família Silva');
});

test('receita: ida e volta mantém todos os campos, a ordem e as datas', async () => {
  const { receitas } = await montar();
  const original = receita();
  await receitas.salvar(original);
  assert.deepEqual(await receitas.obter('r1'), original);
  assert.deepEqual(await receitas.listar(), [original]);
  assert.equal(await receitas.obter('nao-existe'), null);
});

test('receita: salvar de novo substitui os filhos sem sobrar nada (RF10)', async () => {
  const { banco, receitas } = await montar();
  await receitas.salvar(receita());
  await receitas.salvar(receita('r2', 'Pudim'));
  const editada: Receita = {
    ...receita(),
    titulo: 'Bolo de fubá cremoso',
    ingredientes: [{ id: 'novo', quantidade: { valor: 3, texto: '3' }, unidade: null, nome: 'ovos', observacao: null }],
    passos: [{ id: 'p-novo', texto: 'Misture.' }],
    midias: [],
  };
  await receitas.salvar(editada);
  assert.deepEqual(await receitas.obter('r1'), editada);
  assert.equal(banco.contar('ingrediente'), 1 + 3, 'só os da edição e os do pudim');
  assert.equal((await receitas.obter('r2'))?.ingredientes.length, 3);
});

test('receita: excluir apaga ingredientes, passos e mídias em cascata', async () => {
  const { banco, receitas } = await montar();
  await receitas.salvar(receita());
  await receitas.excluir('r1');
  assert.deepEqual(await receitas.listar(), []);
  for (const t of ['ingrediente', 'passo', 'midia']) assert.equal(banco.contar(t), 0, t);
});

test('receita: erro no meio do salvar desfaz tudo (RNF08)', async () => {
  const { receitas } = await montar();
  const original = receita();
  await receitas.salvar(original);
  // O segundo passo repete o id e quebra a chave primária depois de já ter apagado e reinserido coisas.
  const quebrada: Receita = { ...original, titulo: 'mudou', passos: [{ id: 'x', texto: 'a' }, { id: 'x', texto: 'b' }] };
  await assert.rejects(receitas.salvar(quebrada));
  assert.deepEqual(await receitas.obter('r1'), original);
});

test('rascunho: guarda, recupera com datas e limpa; JSON corrompido vira null (RF03)', async () => {
  const { banco, rascunhos } = await montar();
  assert.equal(await rascunhos.recuperar(), null);
  const r = { ...rascunhoVazio('voz'), titulo: 'Bolo', midias: [midia('a1')] };
  await rascunhos.salvar(r);
  await rascunhos.salvar({ ...r, titulo: 'Bolo de fubá' });
  assert.equal(banco.contar('rascunho'), 1);
  const volta = await rascunhos.recuperar();
  assert.equal(volta?.titulo, 'Bolo de fubá');
  assert.ok(volta?.midias[0].criadoEm instanceof Date);
  assert.deepEqual(volta?.midias, r.midias);

  await banco.runAsync('UPDATE rascunho SET payload_json = ?', ['{quebrado']);
  assert.equal(await rascunhos.recuperar(), null);
  await rascunhos.limpar();
  assert.equal(banco.contar('rascunho'), 0);
});

test('lista de compras: substitui mantendo ordem e o "comprado" (RF13)', async () => {
  const { lista } = await montar();
  const itens = [
    { id: 'b', nome: 'fubá', quantidade: 2, unidade: 'xícaras', comprado: true, receitaOrigemId: 'r1' },
    { id: 'a', nome: 'sal', quantidade: null, unidade: null, comprado: false, receitaOrigemId: null },
  ];
  await lista.substituir(itens);
  assert.deepEqual(await lista.listar(), itens);
  await lista.substituir([]);
  assert.deepEqual(await lista.listar(), []);
});

test('caso de uso real sobre o SQLite: SalvarReceitaRevisada grava e edita', async () => {
  const { receitas } = await montar();
  let n = 0;
  const salvar = new SalvarReceitaRevisada({
    receitas,
    midias: { guardar: async () => ({ caminhoLocal: '', tamanhoBytes: 0 }), apagar: async () => {}, espacoUsado: async () => 0 },
    ids: { novo: () => `id${++n}` },
    relogio: { agora: () => new Date(1_700_000_000_000 + n) },
  });
  const r = await salvar.executar({
    ...rascunhoVazio('texto'),
    titulo: 'Pão de queijo',
    ingredientes: [{ quantidade: { valor: 500, texto: '500' }, unidade: 'g', nome: 'polvilho', observacao: null }],
    passos: ['Misture tudo.'],
  });
  assert.ok(r.ok);
  assert.deepEqual(await receitas.obter(r.receita.id), r.receita);
});
