/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { ItemCompra } from '../domain/compras/item-compra.ts';
import { rascunhoVazio, receitaParaRascunho, type Livro, type Midia, type Rascunho, type Receita } from '../domain/receita/receita.ts';
import { codificarApendice, decodificarApendice } from './intercambio/apendice.ts';
import { ArquivoInvalidoError, type LivroParaExportar, type Permissao } from './ports/plataforma.ts';
import { CapturarPorFoto } from './usecases/capturar-por-foto.ts';
import { CapturarPorVoz } from './usecases/capturar-por-voz.ts';
import { ConsultarReceitas } from './usecases/consultar-receitas.ts';
import { ExcluirReceita } from './usecases/excluir-receita.ts';
import { ExportarLivroPdf } from './usecases/exportar-livro-pdf.ts';
import { GerenciarRascunho } from './usecases/gerenciar-rascunho.ts';
import { ImportarPdf, SEM_TEXTO } from './usecases/importar-pdf.ts';
import { ListaDeCompras, textoDaLista } from './usecases/lista-de-compras.ts';
import { SalvarReceitaRevisada } from './usecases/salvar-receita-revisada.ts';

// ---------- Fakes dos ports ----------

function montar() {
  let seq = 0;
  const banco = new Map<string, Receita>();
  let rascunhoGuardado: Rascunho | null = null;
  let lista: ItemCompra[] = [];
  const livro: Livro = { id: 'livro', nome: 'Livro da Família', criadoEm: new Date(0) };
  const apagados: string[] = [];
  const compartilhados: string[] = [];
  const negadas = new Set<Permissao>();
  const pdfs: LivroParaExportar[] = [];

  const receitas = {
    listar: async () => [...banco.values()],
    obter: async (id: string) => banco.get(id) ?? null,
    salvar: async (r: Receita) => void banco.set(r.id, r),
    excluir: async (id: string) => void banco.delete(id),
  };
  const midias = {
    guardar: async (uri: string) => ({ caminhoLocal: `app/${uri}`, tamanhoBytes: 100 }),
    apagar: async (caminho: string) => void apagados.push(caminho),
    uri: (caminho: string) => `file:///${caminho}`,
    espacoUsado: async () => 0,
  };
  const ids = { novo: () => `id${++seq}` };
  const relogio = { agora: () => new Date(1000 * seq) };
  const permissoes = { solicitar: async (p: Permissao) => (negadas.has(p) ? 'negada' as const : 'concedida' as const) };
  const compartilhador = {
    compartilharArquivo: async (uri: string) => void compartilhados.push(uri),
    compartilharTexto: async (t: string) => void compartilhados.push(t),
  };
  const fala = { disponivel: true, texto: '' as string | Error };
  const ocr = { texto: '' as string | Error };
  const pdf = {
    conteudo: { pages: [] as string[], hasText: true } as { pages: string[]; hasText: boolean } | Error,
    paginas: ['pagina1.png', 'pagina2.png'],
  };

  const salvar = new SalvarReceitaRevisada({ receitas, midias, ids, relogio });
  return {
    banco, apagados, compartilhados, negadas, pdfs, livro, fala, ocr, pdf, salvar,
    get rascunhoGuardado() { return rascunhoGuardado; },
    get lista() { return lista; },
    consultar: new ConsultarReceitas({ receitas, livro: { obter: async () => livro, renomear: async () => {} } }),
    excluir: new ExcluirReceita({ receitas, midias }),
    rascunho: new GerenciarRascunho({
      receitas, midias,
      rascunhos: {
        salvar: async (r: Rascunho) => void (rascunhoGuardado = r),
        recuperar: async () => rascunhoGuardado,
        limpar: async () => void (rascunhoGuardado = null),
      },
    }),
    voz: new CapturarPorVoz({
      midias, permissoes, ids, relogio,
      gravador: { start: async () => {}, stop: async () => ({ uri: 'gravacao.m4a', durationSec: 42 }) },
      fala: {
        isAvailable: async () => fala.disponivel,
        transcribe: async () => { if (fala.texto instanceof Error) throw fala.texto; return fala.texto; },
      },
    }),
    foto: new CapturarPorFoto({
      midias, permissoes, ids, relogio,
      ocr: { recognize: async () => { if (ocr.texto instanceof Error) throw ocr.texto; return { text: ocr.texto }; } },
    }),
    compras: new ListaDeCompras({
      ids, compartilhador,
      itens: { listar: async () => lista, substituir: async (i: ItemCompra[]) => void (lista = i) },
    }),
    exportar: new ExportarLivroPdf({
      receitas, compartilhador,
      livro: { obter: async () => livro, renomear: async (n: string) => void (livro.nome = n) },
      gerador: { gerar: async (l: LivroParaExportar) => { pdfs.push(l); return 'livro.pdf'; }, imprimir: async () => {} },
    }),
    importar: new ImportarPdf({
      receitas, salvar,
      seletor: { escolherPdf: async () => 'arquivo.pdf' },
      ocr: { recognize: async (img: string) => ({ text: `texto de ${img}` }) },
      extrator: {
        extract: async () => { if (pdf.conteudo instanceof Error) throw pdf.conteudo; return pdf.conteudo; },
        rasterize: async () => pdf.paginas,
      },
    }),
  };
}

function rascunhoValido(titulo = 'Bolo de fubá', autorNome: string | null = 'Vó Lurdes'): Rascunho {
  return {
    ...rascunhoVazio('texto'),
    titulo, autorNome, rendimentoPorcoes: 8,
    ingredientes: [
      { quantidade: { valor: 2, texto: '2' }, unidade: 'xícaras', nome: 'fubá', observacao: null },
      { quantidade: { valor: null, texto: 'a gosto' }, unidade: null, nome: 'sal', observacao: null },
    ],
    passos: ['Misture tudo.', '  ', 'Asse por 40 minutos.'],
  };
}

const audio = (id: string): Midia => ({
  id, tipo: 'audio', caminhoLocal: `app/${id}.m4a`, duracaoS: 10, tamanhoBytes: 1, transcricao: null, criadoEm: new Date(0),
});

// ---------- Salvar, editar, excluir ----------

test('SalvarReceitaRevisada valida antes de gravar (RN02, RF03)', async () => {
  const app = montar();
  const r = await app.salvar.executar(rascunhoVazio('texto'));
  assert.equal(r.ok, false);
  assert.equal(app.banco.size, 0);
});

test('SalvarReceitaRevisada cria receita com ids e sem linhas vazias', async () => {
  const app = montar();
  const r = await app.salvar.executar({ ...rascunhoValido(), autorNome: '  ' });
  assert.ok(r.ok);
  assert.equal(app.banco.size, 1);
  assert.equal(r.receita.autorNome, null);
  assert.deepEqual(r.receita.passos.map((p) => p.texto), ['Misture tudo.', 'Asse por 40 minutos.']);
  assert.ok(r.receita.ingredientes.every((i) => i.id));
});

test('editar mantém id e data de criação e apaga o áudio removido (RF10)', async () => {
  const app = montar();
  const criada = await app.salvar.executar({ ...rascunhoValido(), midias: [audio('a1'), audio('a2')] });
  assert.ok(criada.ok);
  const edicao = { ...receitaParaRascunho(criada.receita), titulo: 'Bolo de fubá cremoso', midias: [audio('a1')] };
  const editada = await app.salvar.executar(edicao);
  assert.ok(editada.ok);
  assert.equal(editada.receita.id, criada.receita.id);
  assert.equal(editada.receita.criadoEm, criada.receita.criadoEm);
  assert.equal(app.banco.size, 1);
  assert.deepEqual(app.apagados, ['app/a2.m4a']);
});

test('ExcluirReceita apaga a receita e os arquivos', async () => {
  const app = montar();
  const r = await app.salvar.executar({ ...rascunhoValido(), midias: [audio('a1')] });
  assert.ok(r.ok);
  await app.excluir.executar(r.receita.id);
  assert.equal(app.banco.size, 0);
  assert.deepEqual(app.apagados, ['app/a1.m4a']);
});

// ---------- Rascunho ----------

test('rascunho: concluir não apaga arquivos, descartar apaga só os órfãos', async () => {
  const app = montar();
  const salva = await app.salvar.executar({ ...rascunhoValido(), midias: [audio('a1')] });
  assert.ok(salva.ok);

  await app.rascunho.guardar(rascunhoValido());
  assert.ok(await app.rascunho.recuperar());
  await app.rascunho.concluir();
  assert.equal(await app.rascunho.recuperar(), null);
  assert.deepEqual(app.apagados, []);

  const edicao = { ...receitaParaRascunho(salva.receita), midias: [audio('a1'), audio('novo')] };
  await app.rascunho.guardar(edicao);
  await app.rascunho.descartar(edicao);
  assert.deepEqual(app.apagados, ['app/novo.m4a']);
  assert.equal(app.rascunhoGuardado, null);
});

// ---------- Consulta ----------

test('ConsultarReceitas lista as mais recentes primeiro e busca sem acento (RF01, RF02)', async () => {
  const app = montar();
  await app.salvar.executar(rascunhoValido('Pão de queijo'));
  await app.salvar.executar(rascunhoValido('Açúcar queimado'));
  assert.deepEqual((await app.consultar.listar()).map((r) => r.titulo), ['Açúcar queimado', 'Pão de queijo']);
  assert.deepEqual((await app.consultar.buscar('acucar')).map((r) => r.titulo), ['Açúcar queimado']);
  assert.equal((await app.consultar.buscar('FUBA')).length, 2);
});

// ---------- Captura ----------

test('voz: sem microfone não grava (RF04, RF17)', async () => {
  const app = montar();
  app.negadas.add('microfone');
  assert.equal(await app.voz.iniciar(), 'sem-permissao');
});

test('voz: grava, transcreve e devolve rascunho com o áudio e a transcrição (RF06, RF07)', async () => {
  const app = montar();
  assert.equal(await app.voz.iniciar(), 'gravando');
  const gravado = await app.voz.parar();
  assert.equal(gravado.caminhoLocal, 'app/gravacao.m4a');
  assert.equal(gravado.duracaoS, 42);

  app.fala.texto = 'Bolo da vó. Duas xícaras de fubá. Bate tudo no liquidificador.';
  const { rascunho, problema } = await app.voz.transcrever(gravado);
  assert.equal(problema, null);
  assert.equal(rascunho.origem, 'voz');
  assert.equal(rascunho.ingredientes[0].nome, 'fubá');
  assert.equal(rascunho.midias[0].transcricao, app.fala.texto);
  assert.equal(app.banco.size, 0, 'captura nunca grava receita');
});

test('voz: o áudio fica no rascunho quando não dá para transcrever (RF06)', async () => {
  const app = montar();
  const gravado = await app.voz.parar();

  app.fala.disponivel = false;
  let r = await app.voz.transcrever(gravado);
  assert.equal(r.problema, 'indisponivel');
  assert.deepEqual(r.rascunho.midias, [gravado]);

  app.fala.disponivel = true;
  app.negadas.add('fala');
  assert.equal((await app.voz.transcrever(gravado)).problema, 'sem-permissao');
  app.negadas.delete('fala');

  app.fala.texto = new Error('motor caiu');
  assert.equal((await app.voz.transcrever(gravado)).problema, 'falhou');

  const controle = new AbortController();
  controle.abort();
  r = await app.voz.transcrever(gravado, { signal: controle.signal });
  assert.equal(r.problema, 'cancelada');
  assert.deepEqual(r.rascunho.midias, [gravado]);
});

test('foto: texto vai para o rascunho e a foto fica anexada (RF05)', async () => {
  const app = montar();
  app.ocr.texto = 'Pudim\n1 lata de leite condensado\nBata tudo.';
  const ok = await app.foto.extrair('foto.jpg');
  assert.equal(ok.problema, null);
  assert.equal(ok.rascunho.titulo, 'Pudim');
  assert.equal(ok.rascunho.midias[0].tipo, 'foto');

  app.ocr.texto = '   ';
  const vazio = await app.foto.extrair('foto2.jpg');
  assert.equal(vazio.problema, 'sem-texto');
  assert.equal(vazio.rascunho.midias.length, 1);

  app.ocr.texto = new Error('ocr caiu');
  assert.equal((await app.foto.extrair('foto3.jpg')).problema, 'falhou');

  // Cancelou antes da revisão: a foto guardada é apagada.
  await app.foto.descartar(ok.rascunho);
  assert.deepEqual(app.apagados, ['app/foto.jpg']);
});

// ---------- Lista de compras ----------

test('lista de compras: escala, consolida e compartilha (RF13)', async () => {
  const app = montar();
  const r = await app.salvar.executar(rascunhoValido()); // 8 porções, 2 xícaras de fubá
  assert.ok(r.ok);
  await app.compras.adicionarItem('Fubá', 1, 'xícaras');
  let lista = await app.compras.adicionarReceita(r.receita, 4); // metade: 1 xícara
  const fuba = lista.find((i) => i.nome === 'Fubá');
  assert.equal(fuba?.quantidade, 2);
  assert.equal(lista.length, 2);

  lista = await app.compras.marcar(fuba!.id, true);
  assert.equal(textoDaLista(lista), 'Lista de compras\n\n✓ 2 xícaras de Fubá\n• sal');
  await app.compras.compartilhar();
  assert.equal(app.compartilhados.length, 1);
  assert.deepEqual(await app.compras.limpar(), []);

  // Sem rendimento informado, a escala é "vezes a receita".
  const semRendimento = await app.salvar.executar({ ...rascunhoValido('Pudim'), rendimentoPorcoes: null });
  assert.ok(semRendimento.ok);
  lista = await app.compras.adicionarReceita(semRendimento.receita, 3);
  assert.equal(lista.find((i) => i.nome === 'fubá')?.quantidade, 6);
});

// ---------- Apêndice do PDF ----------

test('apêndice: ida e volta com acentos e sem dados locais (RF14, RF15)', async () => {
  const app = montar();
  const r = await app.salvar.executar({ ...rascunhoValido('Pão de ló da vó 🍰'), midias: [audio('a1')], pontoObs: 'até dar o ponto' });
  assert.ok(r.ok);
  const linhas = codificarApendice([r.receita]);
  assert.ok(linhas.every((l) => /^DC1\|\d{3}\/\d{3}\|[A-Za-z0-9+/=]+\|[0-9a-f]{8}$/.test(l)));
  assert.ok(!linhas.join('').includes('app/'));

  const textoDoPdf = `Pão de ló\nqualquer coisa\n${linhas.join('\n')}\nfim`;
  const [volta] = decodificarApendice(textoDoPdf)!;
  assert.equal(volta.titulo, 'Pão de ló da vó 🍰');
  assert.equal(volta.pontoObs, 'até dar o ponto');
  assert.equal(volta.origem, 'pdf');
  assert.deepEqual(volta.passos, ['Misture tudo.', 'Asse por 40 minutos.']);
  assert.deepEqual(volta.ingredientes, rascunhoValido().ingredientes);
  assert.deepEqual(volta.midias, []);
});

test('apêndice: ausente, incompleto ou adulterado não vira receita (RNF09)', () => {
  assert.equal(decodificarApendice('PDF de outro lugar'), null);

  const receita = { titulo: 'X', ingredientes: [], passos: [] } as unknown as Receita;
  const linhas = codificarApendice(Array(5).fill(receita));
  assert.ok(linhas.length > 1);
  assert.equal(decodificarApendice(linhas.slice(1).join('\n')), null, 'faltando linha');
  assert.equal(decodificarApendice(linhas.join('\n').replace(/\|[0-9a-f]{8}$/m, '|00000000')), null, 'checksum errado');

  // Linhas válidas com conteúdo malicioso: só passa o que tem forma de receita.
  const malicioso = btoa(JSON.stringify({ v: 1, receitas: [{ titulo: 123 }, { titulo: 'Ok', passos: [1, 'Asse.'], ingredientes: [{ nome: 'ovo', quantidade: { valor: -1 } }] }] }));
  const soma = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
  const [r] = decodificarApendice(`DC1|001/001|${malicioso}|${soma(malicioso)}`)!;
  assert.equal(r.titulo, 'Ok');
  assert.deepEqual(r.passos, ['Asse.']);
  assert.equal(r.ingredientes[0].quantidade.valor, null);
});

// ---------- Exportar e importar ----------

test('exportar: renomeia o livro, gera com apêndice e compartilha (RF14)', async () => {
  const app = montar();
  const r = await app.salvar.executar(rascunhoValido());
  assert.ok(r.ok);
  await assert.rejects(app.exportar.gerar({ receitaIds: [], incluirFotos: false, nomeDoLivro: '' }));

  const uri = await app.exportar.gerar({ receitaIds: [r.receita.id], incluirFotos: true, nomeDoLivro: 'Receitas da Família Silva' });
  assert.equal(app.livro.nome, 'Receitas da Família Silva');
  assert.equal(app.pdfs[0].receitas.length, 1);
  assert.equal(decodificarApendice(app.pdfs[0].apendice.join('\n'))?.[0].titulo, 'Bolo de fubá');
  await app.exportar.compartilhar(uri);
  assert.deepEqual(app.compartilhados, ['livro.pdf']);
});

test('importar PDF do app: duplicata, substituir mantém o áudio, pular e manter ambas (RF15, RF16)', async () => {
  const app = montar();
  const original = await app.salvar.executar({ ...rascunhoValido(), midias: [audio('a1')] });
  assert.ok(original.ok);
  const outra = { ...original.receita, titulo: 'Pudim' };
  app.pdf.conteudo = { hasText: true, pages: ['Capa', codificarApendice([original.receita, outra]).join('\n')] };

  const leitura = await app.importar.ler('arquivo.pdf');
  assert.equal(leitura.tipo, 'do-app');
  if (leitura.tipo !== 'do-app') return;
  assert.equal(leitura.itens[0].duplicataDe, original.receita.id);
  assert.equal(leitura.itens[1].duplicataDe, null);

  const res = await app.importar.confirmar([
    { item: leitura.itens[0], escolha: 'substituir' },
    { item: leitura.itens[1], escolha: 'pular' },
  ]);
  assert.equal(res.salvas, 1);
  assert.equal(app.banco.size, 1);
  assert.deepEqual(app.banco.get(original.receita.id)?.midias, [audio('a1')]);

  await app.importar.confirmar([{ item: leitura.itens[0], escolha: 'manter-ambas' }]);
  assert.equal(app.banco.size, 2);
});

test('importar PDF de terceiros, escaneado e inválido (RF15)', async () => {
  const app = montar();
  app.pdf.conteudo = { hasText: true, pages: ['Bolo de cenoura\n3 cenouras\nBata no liquidificador.'] };
  const terceiros = await app.importar.ler('x.pdf');
  assert.equal(terceiros.tipo, 'terceiros');
  if (terceiros.tipo === 'terceiros') assert.equal(terceiros.rascunho.ingredientes[0].nome, 'cenouras');

  app.pdf.conteudo = { hasText: false, pages: [] };
  const escaneado = await app.importar.ler('x.pdf');
  assert.equal(escaneado.tipo, 'escaneado');
  if (escaneado.tipo === 'escaneado') {
    // As duas páginas passaram pelo OCR e pelo parser (a primeira linha curta vira título).
    assert.equal(escaneado.rascunho.titulo, 'texto de pagina1.png');
    assert.deepEqual(escaneado.rascunho.naoClassificado, ['texto de pagina2.png']);
  }

  app.pdf.paginas = [];
  assert.deepEqual(await app.importar.ler('x.pdf'), { tipo: 'erro', mensagem: SEM_TEXTO }, 'escaneado sem páginas lidas');

  app.pdf.conteudo = new ArquivoInvalidoError('Esse arquivo não é um PDF.');
  assert.deepEqual(await app.importar.ler('x.txt'), { tipo: 'erro', mensagem: 'Esse arquivo não é um PDF.' });
  assert.equal(app.banco.size, 0, 'ler nunca grava');
});
