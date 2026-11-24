/**
 * Tokens do design system (Docs/pdfs/De-Casa-Design-System.pdf, v1.0, página 7).
 * Regras: uma ação Terracota por tela; Caveat só como toque; Mostarda e Sálvia do moodboard não carregam texto.
 */

export const cores = {
  farinha: '#FBF6EA', // fundo das telas
  papel: '#F1E3C4', // botão voltar, tag, tile
  cafe: '#3B2A20', // texto principal
  terracota: '#A93F28', // ação principal
  salvia: '#6F8561', // só ilustração (3,7:1)
  mostarda: '#D9A441', // só decorativa (2,1:1)
  cartao: '#FFFDF7', // superfície de card e campo; texto sobre Terracota
  cafeSuave: '#6B5547', // texto secundário
  borda: '#E6D6B3', // contorno de card
  bordaControle: '#9A8456', // contorno de campo e aba (proposta do DS: o #CDB98C do protótipo tem 1,9:1)
  linhaCaderno: '#E3D3AE', // pauta e trilho de progresso
  mostardaClara: '#F8E6B8', // aviso, player, chip
  salviaClara: '#E4EBD9', // tile de receita
  salviaEscura: '#4A5F40', // número do passo
} as const;

/** Nomes exportados pelos pacotes @expo-google-fonts (um arquivo por peso). */
export const fontes = {
  titulo: 'Fraunces_700Bold',
  tituloMedio: 'Fraunces_600SemiBold',
  manuscrito: 'Caveat_600SemiBold',
  corpo: 'Nunito_400Regular',
  corpoMedio: 'Nunito_600SemiBold',
  corpoNegrito: 'Nunito_700Bold',
  corpoForte: 'Nunito_800ExtraBold',
} as const;

export const tamanhos = {
  legenda: 12, pequeno: 14, corpo: 16, tituloS: 20, tituloM: 24, tituloL: 28, display: 36, cozinha: 40,
} as const;

export const raios = {
  campo: 12, aviso: 14, card: 16, pilula44: 22, pilula56: 28, pilula68: 34, caderno: 4,
} as const;

export const espaco = { 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 22: 22, tela: 24 } as const;

/** Alvos de toque em dp (RNF05: mínimo 44). */
export const toque = { minimo: 44, linha: 48, acao: 56, cozinha: 68, gravar: 120 } as const;

// shortcut: sombra colorida no Android vira elevation cinza; conferir em aparelho.
export const sombras = {
  card: { shadowColor: cores.cafe, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  flutuante: { shadowColor: cores.cafe, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  acao: { shadowColor: cores.terracota, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  gravar: { shadowColor: cores.terracota, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;
