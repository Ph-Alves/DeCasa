import { useState } from 'react';

import { rascunhoDoTexto } from '../../domain/parser/texto-para-receita.ts';
import { rascunhoVazio } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Botao, Cabecalho, Campo, Tela } from '../ui/componentes.tsx';
import { abrirRevisao } from './abrir-revisao.ts';

/**
 * RF03: cadastrar por texto. O parser separa ingredientes e passos (RF07) e tudo vai para a revisão.
 * shortcut: as abas Voz e Foto entram na etapa de captura.
 */
export function TelaNova() {
  const { rascunho } = useDependencias();
  const [texto, setTexto] = useState('');

  const continuar = () =>
    abrirRevisao(rascunho, texto.trim() ? rascunhoDoTexto(texto, 'texto') : rascunhoVazio('texto'));

  return (
    <Tela acao={<Botao titulo="Continuar: ingredientes e passos" aoTocar={continuar} />}>
      <Cabecalho titulo="Nova receita" rotulo="como a vó prefere contar?" />
      <Campo
        rotulo="Escreva ou cole a receita"
        value={texto}
        onChangeText={setTexto}
        multiline
        placeholder={'Bolo de fubá\n2 xícaras de fubá\n3 ovos\nBata tudo no liquidificador.'}
        style={{ minHeight: 280 }}
        autoFocus
      />
    </Tela>
  );
}
