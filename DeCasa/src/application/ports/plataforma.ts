import type { Midia, Receita } from '../../domain/receita/receita.ts';

export type Permissao = 'microfone' | 'camera' | 'fala';

export interface PermissoesDoSistema {
  solicitar(tipo: Permissao): Promise<'concedida' | 'negada'>;
}

export interface AudioRecorder {
  start(): Promise<void>;
  stop(): Promise<{ uri: string; durationSec: number }>;
}

export type OpcoesDeTranscricao = { onProgress?: (progresso: number) => void; signal?: AbortSignal };

/** O adapter precisa reconhecer no aparelho (RNF03): nenhum áudio vai para servidor. */
export interface SpeechEngine {
  isAvailable(locale: 'pt-BR'): Promise<boolean>;
  transcribe(audioUri: string, opts: OpcoesDeTranscricao): Promise<string>;
}

export interface OcrEngine {
  recognize(imageUri: string): Promise<{ text: string; confidence?: number }>;
}

/** Lançado pelo adapter para arquivo que não é PDF, corrompido ou com senha (RF15). */
export class ArquivoInvalidoError extends Error {}

export interface PdfTextExtractor {
  extract(pdfUri: string): Promise<{ pages: string[]; hasText: boolean }>;
  /** Páginas como imagens, para o OCR de PDF escaneado. Técnica a definir no spike S4. */
  rasterize(pdfUri: string): Promise<string[]>;
}

export type LivroParaExportar = { nome: string; receitas: Receita[]; apendice: string[] };

export interface GeradorDePdf {
  /** Devolve a uri do arquivo gerado. */
  gerar(livro: LivroParaExportar, opts: { incluirFotos: boolean }): Promise<string>;
  imprimir(pdfUri: string): Promise<void>;
}

export interface Compartilhador {
  compartilharArquivo(uri: string): Promise<void>;
  compartilharTexto(texto: string): Promise<void>;
}

export interface SeletorDeArquivo {
  escolherPdf(): Promise<string | null>;
}

/** Arquivos de áudio e foto na área privada do app (RN05, RNF09). */
export interface MidiaStorage {
  /**
   * Copia um arquivo temporário (gravação, câmera, galeria) para o armazenamento do app.
   * `caminhoLocal` é relativo à pasta do app: no iOS o caminho absoluto muda quando o app é atualizado.
   */
  guardar(uriTemporaria: string, tipo: Midia['tipo']): Promise<{ caminhoLocal: string; tamanhoBytes: number }>;
  /** Caminho absoluto (file://) para tocar, mostrar ou mandar para OCR e transcrição. */
  uri(caminhoLocal: string): string;
  apagar(caminhoLocal: string): Promise<void>;
  /** Bytes ocupados por áudios e fotos (RNF10). */
  espacoUsado(): Promise<number>;
}

export interface IdGenerator {
  novo(): string;
}

export interface Relogio {
  agora(): Date;
}
