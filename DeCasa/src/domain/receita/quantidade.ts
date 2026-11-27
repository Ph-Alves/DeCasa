/**
 * Quantidade de um ingrediente (RN03).
 * `valor` nulo = não numérica ("a gosto", "um pouco" ou sem quantidade): nunca é escalada.
 * `texto` é como a quantidade aparece para o usuário.
 */
export type Quantidade = { valor: number | null; texto: string };

export const SEM_QUANTIDADE: Quantidade = { valor: null, texto: '' };

const FRACOES_UNICODE: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const U = Object.keys(FRACOES_UNICODE).join('');

// Números por extenso comuns em receita falada ("duas xícaras", "meia lata").
const POR_EXTENSO: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, meio: 0.5, meia: 0.5,
};

const NUMERO = new RegExp(
  `^(\\d+\\s+\\d+/\\d+|\\d+\\s*[${U}]|\\d+/\\d+|\\d+(?:[.,]\\d+)?|[${U}])`,
);
const EXTENSO = new RegExp(`^(${Object.keys(POR_EXTENSO).join('|')})(?=\\s|$)`, 'i');

function valorDoNumero(token: string): number | null {
  const t = token.replace(',', '.').trim();
  const misto = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (misto) return Number(misto[3]) === 0 ? null : Number(misto[1]) + Number(misto[2]) / Number(misto[3]);
  const inteiroUnicode = t.match(new RegExp(`^(\\d+)\\s*([${U}])$`));
  if (inteiroUnicode) return Number(inteiroUnicode[1]) + FRACOES_UNICODE[inteiroUnicode[2]];
  const fracao = t.match(/^(\d+)\/(\d+)$/);
  if (fracao) return Number(fracao[2]) === 0 ? null : Number(fracao[1]) / Number(fracao[2]);
  if (t in FRACOES_UNICODE) return FRACOES_UNICODE[t];
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lê a quantidade numérica no início do texto ("2 xícaras", "1 1/2", "½", "duas").
 * Devolve null se o texto não começa com quantidade.
 */
export function lerQuantidade(texto: string): { quantidade: Quantidade; resto: string } | null {
  const s = texto.trim();
  const num = s.match(NUMERO);
  if (num) {
    const valor = valorDoNumero(num[1]);
    if (valor === null || valor <= 0) return null;
    return { quantidade: { valor, texto: num[1].trim() }, resto: s.slice(num[0].length).trim() };
  }
  const ext = s.match(EXTENSO);
  if (ext) {
    return {
      quantidade: { valor: POR_EXTENSO[ext[1].toLowerCase()], texto: ext[1] },
      resto: s.slice(ext[0].length).trim(),
    };
  }
  return null;
}

const FRACOES_LEGIVEIS: [number, string][] = [
  [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'],
  [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8'],
];

/** 1.5 → "1 1/2", 0.5 → "1/2", 2 → "2". Sem fração próxima, usa decimal com vírgula (RF12). */
export function formatarQuantidade(valor: number): string {
  const TOL = 0.02;
  let inteiro = Math.floor(valor);
  const resto = valor - inteiro;
  if (resto < TOL) return String(inteiro);
  if (1 - resto < TOL) return String(inteiro + 1);
  const fracao = FRACOES_LEGIVEIS.find(([v]) => Math.abs(v - resto) < TOL);
  if (!fracao) return String(Math.round(valor * 100) / 100).replace('.', ',');
  return inteiro === 0 ? fracao[1] : `${inteiro} ${fracao[1]}`;
}
