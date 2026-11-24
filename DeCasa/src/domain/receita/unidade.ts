import { normalizar } from '../texto.ts';

// Abreviações não vão para o plural ("2 kg", "500 g").
const ABREVIACOES = /^(kg|g|gr|ml|l|cs|cc|x[íi]c\.?|col\.?)$/i;

/** "xícara" → "xícaras", "colher de sopa" → "colheres de sopa" quando a quantidade passa de 1. */
export function unidadeConcordante(unidade: string | null, valor: number | null): string | null {
  if (!unidade || valor === null || valor <= 1) return unidade;
  const [primeira, ...resto] = unidade.split(' ');
  if (ABREVIACOES.test(primeira) || /s$/i.test(primeira)) return unidade;
  const plural = /[rz]$/i.test(primeira) ? `${primeira}es` : /[aeiouáéíóú]$/i.test(primeira) ? `${primeira}s` : primeira;
  return [plural, ...resto].join(' ');
}

/** Chave para comparar unidades (RN04): "Xícaras", "xícara" e "xicara" são a mesma. */
export function chaveDaUnidade(unidade: string | null): string {
  return normalizar(unidade ?? '')
    .split(' ')
    .map((p, i) => (i === 0 ? p.replace(/s$/, '').replace(/([rz])e$/, '$1') : p))
    .join(' ');
}
