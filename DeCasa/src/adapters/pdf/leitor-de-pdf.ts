import { getDocumentAsync } from 'expo-document-picker';
import { extractText } from 'expo-pdf-text-extract';

import { ArquivoInvalidoError, type PdfTextExtractor, type SeletorDeArquivo } from '../../application/ports/plataforma.ts';

/** PDF de outra pessoa é entrada não confiável (RNF09): nada muito grande entra no app. */
const LIMITE_BYTES = 50 * 1024 * 1024;

/** RF15: o seletor do sistema copia o PDF para o cache do app; o original não é tocado. */
export const seletorDoSistema: SeletorDeArquivo = {
  async escolherPdf() {
    const escolha = await getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
    if (escolha.canceled) return null;
    const arquivo = escolha.assets[0];
    if ((arquivo.size ?? 0) > LIMITE_BYTES) throw new ArquivoInvalidoError('Esse PDF é grande demais (mais de 50 MB).');
    return arquivo.uri;
  },
};

/**
 * Texto do PDF no aparelho (PDFKit no iOS, PDFBox no Android).
 * shortcut: sem rasterizar páginas; PDF escaneado cai no aviso de usar a aba Foto. Upgrade: módulo local com PDFKit/PdfRenderer em 2x ou mais.
 */
export const leitorDePdf: PdfTextExtractor = {
  async extract(pdfUri: string) {
    let texto: string;
    try {
      texto = await extractText(pdfUri);
    } catch (e) {
      const codigo = (e as { code?: string }).code;
      if (codigo === 'PASSWORD_REQUIRED' || codigo === 'INCORRECT_PASSWORD') {
        throw new ArquivoInvalidoError('Esse PDF tem senha. Abra-o, salve uma cópia sem senha e tente de novo.');
      }
      throw new ArquivoInvalidoError('Não foi possível abrir esse arquivo. Ele não é um PDF ou está corrompido.');
    }
    return { pages: [texto], hasText: texto.trim().length > 0 };
  },
  async rasterize() {
    return [];
  },
};
