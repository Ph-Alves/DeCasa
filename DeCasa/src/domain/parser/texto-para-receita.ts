import { normalizar } from '../texto.ts';
import { lerQuantidade, SEM_QUANTIDADE, type Quantidade } from '../receita/quantidade.ts';
import type { Ingrediente } from '../receita/receita.ts';

/** Saída do parser: vira parte de um Rascunho, que o usuário revisa antes de salvar (RN02). */
export type ReceitaExtraida = {
  titulo: string;
  ingredientes: Omit<Ingrediente, 'id'>[];
  passos: string[];
  naoClassificado: string[];
};

const UNIDADE = new RegExp(
  '^(' +
    [
      'x[íi]caras?(?: de ch[áa])?', 'x[íi]c\\.?',
      'colher(?:es)?(?: \\(?(?:de |das )?(?:sopa|ch[áa]|sobremesa|caf[ée])\\)?)?', 'cs', 'cc',
      'copos?(?: americanos?)?', 'kg', 'gr?', 'gramas?', 'quilos?', 'ml', 'l', 'litros?',
      'latas?', 'pacotes?', 'pitadas?', 'dentes?', 'unidades?', 'fatias?', 'peda[çc]os?',
      'ma[çc]os?', 'tabletes?', 'caixinhas?', 'caixas?', 'potes?', 'envelopes?', 'folhas?',
      'ramos?', 'punhados?', 'gotas?', 'saquinhos?',
    ].join('|') +
    ')(?=\\s|$|,)',
  'i',
);

// Primeira palavra que indica passo: imperativo e a forma falada ("bata" e "bate").
const VERBOS_DE_PASSO = new Set(
  (
    'misture mistura bata bate coloque coloca ponha poe leve leva asse assa adicione adiciona ' +
    'junte junta acrescente acrescenta despeje despeja unte unta mexa mexe cozinhe frite frita ' +
    'corte corta pique pica deixe deixa sirva serve aqueca preaqueca pre-aqueca retire retira tire tira ' +
    'desligue desliga espere espera polvilhe polvilha cubra cobre enrole enrola amasse amassa ' +
    'peneire peneira refogue refoga tempere tempera ferva ferve abra abre separe separa lave lava ' +
    'escorra escorre sove sova modele modela faca faz pegue pega derreta derrete ' +
    'depois entao quando enquanto por em finalize finaliza decore decora reserve reserva'
  ).split(' '),
);

const CABECALHO_INGREDIENTES = /^ingredientes?$/;
const CABECALHO_PREPARO = /^(modo de (preparo|fazer)|preparo|como fazer|preparacao|passos?)$/;

const MARCADOR_DE_LISTA = /^(?:[-•*–·]|\d{1,2}\s*[.)ºª°-])\s+/;

const PALAVRAS_PARA_SER_PASSO = 8;

function lerIngrediente(linha: string, aceitarSemQuantidade: boolean): Omit<Ingrediente, 'id'> | null {
  const aGosto = linha.match(/^(.+?)[\s,]+a gosto\.?$/i);
  if (aGosto) return montar({ valor: null, texto: 'a gosto' }, aGosto[1]);

  const umPouco = linha.match(/^um pouco (?:de |do |da )?(.+)$/i);
  if (umPouco) return montar({ valor: null, texto: 'um pouco' }, umPouco[1]);

  const lido = lerQuantidade(linha);
  if (lido) return montar(lido.quantidade, lido.resto);
  return aceitarSemQuantidade ? montar(SEM_QUANTIDADE, linha) : null;
}

function montar(quantidade: Quantidade, resto: string): Omit<Ingrediente, 'id'> | null {
  let unidade: string | null = null;
  const u = resto.match(UNIDADE);
  if (u) {
    unidade = u[1];
    resto = resto.slice(u[0].length).trim();
  }
  const nome = resto.replace(/^(?:de|do|da|dos|das)\s+/i, '').replace(/[.;]$/, '').trim();
  if (!nome) return null;
  return { quantidade, unidade, nome, observacao: null };
}

function ehPasso(linha: string): boolean {
  const primeira = normalizar(linha).split(' ')[0].replace(/[,:;.]$/, '');
  return VERBOS_DE_PASSO.has(primeira) || linha.split(/\s+/).length >= PALAVRAS_PARA_SER_PASSO;
}

/** Quebra em linhas e, dentro de linhas longas (texto falado), em frases. */
function emLinhas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim().replace(MARCADOR_DE_LISTA, ''))
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=\S)/))
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * RF07: separa texto corrido (OCR, transcrição, PDF ou colado) em título, ingredientes e passos.
 * Determinístico. O que não dá para classificar vai para `naoClassificado`.
 * shortcut: não separa vários ingredientes na mesma frase ("2 ovos, 1 de açúcar e..."); melhorar após o spike S1.
 */
export function textoParaReceita(texto: string): ReceitaExtraida {
  const saida: ReceitaExtraida = { titulo: '', ingredientes: [], passos: [], naoClassificado: [] };
  let secao: 'nenhuma' | 'ingredientes' | 'preparo' = 'nenhuma';

  for (const [i, linha] of emLinhas(texto).entries()) {
    const cabecalho = normalizar(linha).replace(/:$/, '');
    if (CABECALHO_INGREDIENTES.test(cabecalho)) { secao = 'ingredientes'; continue; }
    if (CABECALHO_PREPARO.test(cabecalho)) { secao = 'preparo'; continue; }
    // Subtítulo tipo "Massa:" ou "Cobertura:": o usuário decide onde fica.
    if (linha.endsWith(':')) { saida.naoClassificado.push(linha); continue; }
    if (secao === 'preparo') { saida.passos.push(linha); continue; }

    const ingrediente = lerIngrediente(linha, false);
    if (ingrediente) { saida.ingredientes.push(ingrediente); continue; }
    if (ehPasso(linha)) { saida.passos.push(linha); continue; }

    const semQuantidade = secao === 'ingredientes' ? lerIngrediente(linha, true) : null;
    if (semQuantidade) saida.ingredientes.push(semQuantidade);
    else if (i === 0 && linha.length <= 60) saida.titulo = linha.replace(/[.:]$/, '');
    else saida.naoClassificado.push(linha);
  }

  return saida;
}
