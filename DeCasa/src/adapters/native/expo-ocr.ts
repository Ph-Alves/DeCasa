import { extractTextFromImage } from 'expo-text-extractor';

import type { OcrEngine } from '../../application/ports/plataforma.ts';

/**
 * RF05: OCR no aparelho (Vision no iOS, ML Kit no Android), sem internet (RNF03).
 * A lib devolve uma linha por bloco reconhecido; juntamos com quebra de linha para o parser.
 * shortcut: a lib não escolhe idioma nem orientação; a foto chega já endireitada pelo expo-image-picker.
 */
export const ocrDoAparelho: OcrEngine = {
  async recognize(imageUri: string) {
    return { text: (await extractTextFromImage(imageUri)).join('\n') };
  },
};
