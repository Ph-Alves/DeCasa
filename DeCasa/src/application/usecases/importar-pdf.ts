import { rascunhoDoTexto } from '../../domain/parser/texto-para-receita.ts';
import { ehPossivelDuplicata, type Rascunho } from '../../domain/receita/receita.ts';
import { decodificarApendice, removerApendice } from '../intercambio/apendice.ts';
import { ArquivoInvalidoError, type OcrEngine, type PdfTextExtractor, type SeletorDeArquivo } from '../ports/plataforma.ts';
import type { ReceitaRepository } from '../ports/repositorios.ts';
import type { SalvarReceitaRevisada } from './salvar-receita-revisada.ts';

/** `duplicataDe`: id da receita do livro com mesmo título e autor (RF16). */
export type ItemImportado = { rascunho: Rascunho; duplicataDe: string | null };

export type LeituraDoPdf =
  /** PDF do próprio app: resumo e confirmação, sem parser. */
  | { tipo: 'do-app'; itens: ItemImportado[] }
  /** Melhor esforço: vai para a tela de revisão (RF08). */
  | ({ tipo: 'terceiros' | 'escaneado' } & ItemImportado)
  | { tipo: 'erro'; mensagem: string };

export type EscolhaDeImportacao = 'manter-ambas' | 'substituir' | 'pular';

type Deps = {
  seletor: SeletorDeArquivo;
  extrator: PdfTextExtractor;
  ocr: OcrEngine;
  receitas: ReceitaRepository;
  salvar: SalvarReceitaRevisada;
};

/** RF15 e RF16. Nada é gravado sem confirmação, e só pelo SalvarReceitaRevisada (RN02). */
export class ImportarPdf {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  escolherArquivo(): Promise<string | null> {
    return this.d.seletor.escolherPdf();
  }

  async ler(pdfUri: string): Promise<LeituraDoPdf> {
    let conteudo: { pages: string[]; hasText: boolean };
    try {
      conteudo = await this.d.extrator.extract(pdfUri);
    } catch (e) {
      if (e instanceof ArquivoInvalidoError) return { tipo: 'erro', mensagem: e.message };
      throw e;
    }

    const existentes = await this.d.receitas.listar();
    const marcar = (rascunho: Rascunho): ItemImportado => ({
      rascunho,
      duplicataDe: existentes.find((e) => ehPossivelDuplicata(e, rascunho))?.id ?? null,
    });

    if (conteudo.hasText) {
      const texto = conteudo.pages.join('\n');
      const doApp = decodificarApendice(texto);
      if (doApp?.length) return { tipo: 'do-app', itens: doApp.map(marcar) };
      return { tipo: 'terceiros', ...marcar(rascunhoDoTexto(removerApendice(texto), 'pdf')) };
    }

    // Sem texto: PDF escaneado, página por página no OCR.
    const textos: string[] = [];
    for (const imagem of await this.d.extrator.rasterize(pdfUri)) {
      textos.push((await this.d.ocr.recognize(imagem)).text);
    }
    return { tipo: 'escaneado', ...marcar(rascunhoDoTexto(textos.join('\n'), 'pdf')) };
  }

  /** Grava o que o usuário confirmou no resumo do PDF do app. */
  async confirmar(
    escolhas: { item: ItemImportado; escolha: EscolhaDeImportacao }[],
  ): Promise<{ salvas: number; falhas: { titulo: string; erros: string[] }[] }> {
    let salvas = 0;
    const falhas: { titulo: string; erros: string[] }[] = [];

    for (const { item, escolha } of escolhas) {
      if (escolha === 'pular') continue;
      let rascunho = { ...item.rascunho, receitaId: null as string | null };
      if (escolha === 'substituir' && item.duplicataDe) {
        // Substituir troca o texto, mas mantém o áudio e as fotos da receita do livro.
        const atual = await this.d.receitas.obter(item.duplicataDe);
        rascunho = { ...rascunho, receitaId: item.duplicataDe, midias: atual?.midias ?? [] };
      }
      const resultado = await this.d.salvar.executar(rascunho);
      if (resultado.ok) salvas++;
      else falhas.push({ titulo: rascunho.titulo, erros: resultado.erros });
    }
    return { salvas, falhas };
  }
}
