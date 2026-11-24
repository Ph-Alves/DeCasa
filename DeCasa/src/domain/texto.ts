/** Minúsculas, sem acentos e com espaços simples. Base de busca, duplicata e consolidação. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
