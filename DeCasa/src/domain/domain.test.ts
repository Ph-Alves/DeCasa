/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizar } from './texto.ts';
import { formatarQuantidade, lerQuantidade } from './receita/quantidade.ts';
import {
  correspondeBusca, ehPossivelDuplicata, rascunhoVazio, validarRascunho, type Receita,
} from './receita/receita.ts';
import { escalar } from './porcoes/escalar.ts';
import { chaveDaUnidade, unidadeConcordante } from './receita/unidade.ts';
import { consolidarItens, type ItemCompra } from './compras/item-compra.ts';
import { ingredienteDaLinha, textoDoIngrediente, textoParaReceita } from './parser/texto-para-receita.ts';

test('normalizar tira acento e caixa', () => {
  assert.equal(normalizar('  Açúcar   MASCAVO '), 'acucar mascavo');
});

test('lerQuantidade aceita os formatos de RN03', () => {
  const v = (t: string) => lerQuantidade(t)?.quantidade.valor;
  assert.equal(v('2 xícaras'), 2);
  assert.equal(v('1,5 kg'), 1.5);
  assert.equal(v('1.5 kg'), 1.5);
  assert.equal(v('1/2 xícara'), 0.5);
  assert.equal(v('½ xícara'), 0.5);
  assert.equal(v('1 1/2 xícara'), 1.5);
  assert.equal(v('1½ xícara'), 1.5);
  assert.equal(v('duas xícaras'), 2);
  assert.equal(v('meia lata'), 0.5);
  assert.equal(lerQuantidade('1/0 xícara'), null);
  assert.equal(lerQuantidade('sal'), null);
  assert.equal(lerQuantidade('umas coisas'), null); // "um" precisa ser palavra inteira
});

test('formatarQuantidade mostra fração legível (RF12)', () => {
  assert.equal(formatarQuantidade(2), '2');
  assert.equal(formatarQuantidade(0.5), '1/2');
  assert.equal(formatarQuantidade(1.5), '1 1/2');
  assert.equal(formatarQuantidade(1 / 3), '1/3');
  assert.equal(formatarQuantidade(0.999), '1');
  assert.equal(formatarQuantidade(1.2), '1,2');
});

test('escalar dobra números e mantém "a gosto" (RF12)', () => {
  const ing = [
    { quantidade: { valor: 2, texto: '2' }, unidade: 'xícaras', nome: 'fubá' },
    { quantidade: { valor: 0.5, texto: '1/2' }, unidade: 'xícara', nome: 'leite' },
    { quantidade: { valor: null, texto: 'a gosto' }, unidade: null, nome: 'sal' },
  ];
  const dobro = escalar(ing, 4, 8);
  assert.deepEqual(dobro.map((i) => i.quantidade.texto), ['4', '1', 'a gosto']);
  assert.equal(ing[0].quantidade.valor, 2, 'não altera a receita original');
  assert.deepEqual(escalar(ing, 4, 6).map((i) => i.quantidade.texto), ['3', '3/4', 'a gosto']);
  assert.deepEqual(escalar(ing, 1, 4).map((i) => i.unidade), ['xícaras', 'xícaras', null], 'unidade concorda');
  assert.throws(() => escalar(ing, 0, 2), RangeError);
});

test('consolidarItens soma mesmo nome e unidade (RN04)', () => {
  const item = (nome: string, quantidade: number | null, unidade: string | null, comprado = false): ItemCompra =>
    ({ id: nome + quantidade, nome, quantidade, unidade, comprado, receitaOrigemId: null });
  const lista = consolidarItens([
    item('Açúcar', 1, 'xícara'),
    item('acucar', 2, 'Xícara', true),
    item('açúcar', 100, 'g'),
    item('sal', null, null),
    item('Sal', null, null),
  ]);
  assert.equal(lista.length, 3);
  assert.equal(lista[0].quantidade, 3);
  assert.equal(lista[0].comprado, false);
  assert.equal(lista[1].quantidade, 100);
  assert.equal(lista[2].quantidade, null);
});

test('validarRascunho exige título, ingrediente e passo (RF03)', () => {
  const r = rascunhoVazio('texto');
  assert.equal(validarRascunho(r).length, 3);
  r.titulo = 'Bolo de fubá';
  r.ingredientes = [{ quantidade: { valor: 2, texto: '2' }, unidade: 'xícaras', nome: 'fubá', observacao: null }];
  r.passos = ['Misture tudo.'];
  assert.deepEqual(validarRascunho(r), []);
  r.rendimentoPorcoes = 0;
  assert.equal(validarRascunho(r).length, 1);
});

test('duplicata e busca ignoram acento e caixa (RF02, RF16)', () => {
  assert.ok(ehPossivelDuplicata({ titulo: 'Pão de Queijo', autorNome: 'Vó Lurdes' }, { titulo: 'pao de queijo', autorNome: 'vo lurdes' }));
  assert.ok(!ehPossivelDuplicata({ titulo: 'Pão de Queijo', autorNome: 'Vó Lurdes' }, { titulo: 'Pão de Queijo', autorNome: null }));

  const receita = {
    titulo: 'Bolo da vó', autorNome: 'Dona Cida',
    ingredientes: [{ nome: 'açúcar' }, { nome: 'fubá' }],
  } as Receita;
  assert.ok(correspondeBusca(receita, 'acucar'));
  assert.ok(correspondeBusca(receita, 'FUBA'));
  assert.ok(correspondeBusca(receita, 'cida'));
  assert.ok(!correspondeBusca(receita, 'chocolate'));
});

test('parser: receita de caderno com seções (RF07)', () => {
  const r = textoParaReceita(`Bolo de fubá
Ingredientes:
- 2 xícaras de fubá
- 1 de açúcar
- 3 ovos
- 1 xícara (chá) de leite
- 1 colher de sopa de fermento
- Sal a gosto
- Manteiga para untar
Modo de preparo:
1. Bata tudo no liquidificador.
2. Asse por 40 minutos.`);

  assert.equal(r.titulo, 'Bolo de fubá');
  assert.deepEqual(
    r.ingredientes.map((i) => [i.quantidade.texto, i.unidade, i.nome]),
    [
      ['2', 'xícaras', 'fubá'],
      ['1', null, 'açúcar'],
      ['3', null, 'ovos'],
      ['1', 'xícara', '(chá) de leite'],
      ['1', 'colher de sopa', 'fermento'],
      ['a gosto', null, 'Sal'],
      ['', null, 'Manteiga para untar'],
    ],
  );
  assert.deepEqual(r.passos, ['Bata tudo no liquidificador.', 'Asse por 40 minutos.']);
  assert.deepEqual(r.naoClassificado, []);
});

test('parser: texto falado sem quebras de linha (RF07)', () => {
  const r = textoParaReceita(
    'Duas xícaras de fubá. Meia xícara de óleo. Bate tudo no liquidificador. Depois leva ao forno até dourar. Pronto.',
  );
  assert.deepEqual(r.ingredientes.map((i) => [i.quantidade.valor, i.nome]), [[2, 'fubá'], [0.5, 'óleo']]);
  assert.deepEqual(r.passos, ['Bate tudo no liquidificador.', 'Depois leva ao forno até dourar.']);
  assert.deepEqual(r.naoClassificado, ['Pronto.']);
});

test('parser: vários ingredientes numa frase falada (transcrição real do spike S1)', () => {
  const r = textoParaReceita(
    'Bolo de fubá davó, duas xícaras de fubá, três ovos e meia xícara de açúcar. Bá tá tudo no liquidificador liasse por quarenta minutos.',
  );
  assert.equal(r.titulo, 'Bolo de fubá davó');
  assert.deepEqual(r.ingredientes.map((i) => [i.quantidade.valor, i.unidade, i.nome]),
    [[2, 'xícaras', 'fubá'], [3, null, 'ovos'], [0.5, 'xícara', 'açúcar']]);
  assert.equal(r.passos.length, 1);
  // Não separa quando um pedaço não é ingrediente: passo e "sal e pimenta" ficam inteiros.
  assert.deepEqual(textoParaReceita('Bata 3 ovos e 2 xícaras de açúcar').passos, ['Bata 3 ovos e 2 xícaras de açúcar']);
  assert.deepEqual(textoParaReceita('2 ovos\nsal e pimenta a gosto').ingredientes.map((i) => i.nome), ['ovos', 'sal e pimenta']);
  assert.deepEqual(textoParaReceita('1 lata de leite condensado e 1 de creme de leite').ingredientes.map((i) => i.nome),
    ['leite condensado', 'creme de leite']);
});

test('parser é determinístico e não quebra com texto vazio ou estranho', () => {
  const texto = 'Massa:\n200g farinha\nMexa bem.';
  assert.deepEqual(textoParaReceita(texto), textoParaReceita(texto));
  const r = textoParaReceita(texto);
  assert.deepEqual(r.naoClassificado, ['Massa:']);
  assert.deepEqual(r.ingredientes.map((i) => [i.quantidade.valor, i.unidade, i.nome]), [[200, 'g', 'farinha']]);
  assert.deepEqual(textoParaReceita('   \n\n'), { titulo: '', ingredientes: [], passos: [], naoClassificado: [] });
});

test('ingrediente vai e volta da caixa de texto da revisão (RF03)', () => {
  for (const linha of ['2 xícaras de fubá', '3 ovos', 'sal a gosto', 'um pouco de canela', 'Manteiga para untar', '1 1/2 colher de sopa de fermento']) {
    assert.equal(textoDoIngrediente(ingredienteDaLinha(linha)!), linha);
  }
  assert.equal(ingredienteDaLinha('- 200g farinha')?.unidade, 'g');
  assert.equal(ingredienteDaLinha('   '), null);
});

test('unidade concorda com a quantidade e soma no singular ou plural (RF12, RN04)', () => {
  assert.equal(unidadeConcordante('xícara', 2), 'xícaras');
  assert.equal(unidadeConcordante('colher de sopa', 3), 'colheres de sopa');
  assert.equal(unidadeConcordante('dente', 2), 'dentes');
  assert.equal(unidadeConcordante('kg', 2), 'kg');
  assert.equal(unidadeConcordante('xícaras', 2), 'xícaras');
  assert.equal(unidadeConcordante('xícara', 1), 'xícara');
  assert.equal(unidadeConcordante('xícara', 0.5), 'xícara');
  for (const [a, b] of [['xícara', 'Xicaras'], ['colher', 'colheres'], ['dente', 'dentes'], ['colher de sopa', 'colheres de sopa']]) {
    assert.equal(chaveDaUnidade(a), chaveDaUnidade(b), `${a} = ${b}`);
  }
  assert.notEqual(chaveDaUnidade('xícara'), chaveDaUnidade('g'));
  const somados = consolidarItens([
    { id: 'a', nome: 'fubá', quantidade: 1, unidade: 'xícara', comprado: false, receitaOrigemId: null },
    { id: 'b', nome: 'fubá', quantidade: 2, unidade: 'xícaras', comprado: false, receitaOrigemId: null },
  ]);
  assert.deepEqual(somados.map((i) => [i.quantidade, i.unidade]), [[3, 'xícaras']]);
});
