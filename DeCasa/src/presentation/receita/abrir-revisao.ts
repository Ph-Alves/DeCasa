import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { GerenciarRascunho } from '../../application/usecases/gerenciar-rascunho.ts';
import type { Rascunho } from '../../domain/receita/receita.ts';

/** Alert como promessa: devolve o índice do botão tocado (ou -1 se fechou). */
export function perguntar(titulo: string, mensagem: string, botoes: { texto: string; estilo?: 'cancel' | 'destructive' }[]): Promise<number> {
  return new Promise((resolver) => {
    Alert.alert(
      titulo,
      mensagem,
      botoes.map((b, i) => ({ text: b.texto, style: b.estilo, onPress: () => resolver(i) })),
      { cancelable: true, onDismiss: () => resolver(-1) },
    );
  });
}

/**
 * Guarda o rascunho e abre a revisão (RN02: toda receita passa por ela).
 * Só existe um rascunho por vez: se houver outro em andamento, a pessoa decide antes.
 * Devolve true só se `novo` foi guardado; senão quem chamou continua dono das mídias dele.
 */
export async function abrirRevisao(rascunho: GerenciarRascunho, novo: Rascunho): Promise<boolean> {
  const pendente = await rascunho.recuperar();
  if (pendente) {
    const nome = pendente.titulo.trim() || 'sem nome';
    const escolha = await perguntar(
      'Tem uma receita em andamento',
      `A receita "${nome}" ainda não foi salva no livro.`,
      [{ texto: 'Continuar a anterior' }, { texto: 'Descartar a anterior', estilo: 'destructive' }, { texto: 'Cancelar', estilo: 'cancel' }],
    );
    if (escolha === 0) router.push('/revisar');
    if (escolha !== 1) return false;
    await rascunho.descartar(pendente);
  }
  await rascunho.guardar(novo);
  router.push('/revisar');
  return true;
}
