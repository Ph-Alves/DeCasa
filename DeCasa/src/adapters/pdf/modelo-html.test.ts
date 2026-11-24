/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { codificarApendice, decodificarApendice } from '../../application/intercambio/apendice.ts';
import type { Receita } from '../../domain/receita/receita.ts';
import { escapar, htmlDoLivro } from './modelo-html.ts';

const receita = (titulo: string, extra: Partial<Receita> = {}): Receita => ({
  id: titulo, titulo, autorNome: 'Vó Maria', rendimentoPorcoes: 8, pontoObs: null, quandoFaz: 'aos domingos', origem: 'texto',
  ingredientes: [{ id: 'i', quantidade: { valor: 2, texto: '2' }, unidade: 'xícaras', nome: 'fubá', observacao: null }],
  passos: [{ id: 'p', texto: 'Bata tudo.' }],
  midias: [], criadoEm: new Date(0), atualizadoEm: new Date(0), ...extra,
});

test('escapar neutraliza HTML vindo de receita (RNF09)', () => {
  assert.equal(escapar(`<img src=x onerror="alert('oi')"> & co`), '&lt;img src=x onerror=&quot;alert(&#39;oi&#39;)&quot;&gt; &amp; co');
});

test('livro em HTML: capa, uma página por receita, texto e apêndice (RF14)', () => {
  const receitas = [receita('Bolo de fubá'), receita('Pão <script>alert(1)</script>')];
  const html = htmlDoLivro({ nome: 'Receitas da Família Silva', receitas, apendice: codificarApendice(receitas) });

  assert.ok(html.includes('<h1>Receitas da Família Silva</h1>'));
  assert.ok(html.includes('2 receitas'));
  assert.equal(html.match(/class="receita"/g)?.length, 2);
  assert.ok(html.includes('<li>2 xícaras de fubá</li>'));
  assert.ok(html.includes('por Vó Maria · rende 8 porções · aos domingos'));
  assert.ok(!html.includes('<script>'), 'texto da receita não vira código');

  // O apêndice sai do HTML do jeito que a importação lê (o PDF guarda o mesmo texto).
  assert.deepEqual(decodificarApendice(html)?.map((r) => r.titulo), ['Bolo de fubá', 'Pão <script>alert(1)</script>']);
});

test('fotos só entram quando o gerador fornece', () => {
  const comFoto = receita('Pudim', {
    midias: [{ id: 'f', tipo: 'foto', caminhoLocal: 'midias/f.jpg', duracaoS: null, tamanhoBytes: 1, transcricao: null, criadoEm: new Date(0) }],
  });
  const livro = { nome: 'Livro', receitas: [comFoto], apendice: [] };
  assert.ok(!htmlDoLivro(livro).includes('<img'));
  assert.ok(htmlDoLivro(livro, () => 'data:image/jpeg;base64,AAAA').includes('<img class="foto" src="data:image/jpeg;base64,AAAA" />'));
});
