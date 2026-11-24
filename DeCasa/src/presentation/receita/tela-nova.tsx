import { useAudioRecorder } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';

import { rascunhoDoTexto } from '../../domain/parser/texto-para-receita.ts';
import { rascunhoVazio, type Midia } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { GravadorDeVoz } from '../captura/gravador-de-voz.tsx';
import { Abas, Botao, Cabecalho, Campo, Tela } from '../ui/componentes.tsx';
import { abrirRevisao } from './abrir-revisao.ts';

type Aba = 'voz' | 'texto';

/**
 * RF03 e RF04. Voz é a aba padrão: do livro até gravar são 2 toques (RNF06).
 * shortcut: a aba Foto entra na etapa de OCR.
 */
export function TelaNova() {
  const deps = useDependencias();
  const gravador = useAudioRecorder(deps.opcoesDeGravacao);
  const voz = useMemo(() => deps.capturaPorVoz(gravador), [deps, gravador]);
  const [aba, setAba] = useState<Aba>('voz');
  const [texto, setTexto] = useState('');
  const [audio, setAudio] = useState<Midia | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Sair da tela com uma gravação que não foi para a revisão: o arquivo não pode ficar órfão.
  const pendente = useRef<Midia | null>(null);
  pendente.current = audio;
  useEffect(() => () => {
    if (pendente.current) voz.descartar(pendente.current);
  }, [voz]);

  async function continuar() {
    setOcupado(true);
    if (aba === 'voz' && audio) {
      const { rascunho } = await voz.transcrever(audio);
      if (await abrirRevisao(deps.rascunho, rascunho)) {
        pendente.current = null; // agora o áudio é do rascunho
        setAudio(null);
      }
    } else {
      await abrirRevisao(deps.rascunho, texto.trim() ? rascunhoDoTexto(texto, 'texto') : rascunhoVazio('texto'));
    }
    setOcupado(false);
  }

  const podeContinuar = aba === 'texto' || audio !== null;
  return (
    <Tela acao={<Botao titulo="Continuar: ingredientes e passos" aoTocar={continuar} desativado={!podeContinuar || ocupado} />}>
      <Cabecalho titulo="Nova receita" rotulo="como a vó prefere contar?" />
      <Abas<Aba> opcoes={[{ valor: 'voz', titulo: 'Voz' }, { valor: 'texto', titulo: 'Texto' }]} valor={aba} aoMudar={setAba} />

      {aba === 'voz' ? (
        <GravadorDeVoz gravador={gravador} voz={voz} audio={audio} aoMudarAudio={setAudio} aoPreferirTexto={() => setAba('texto')} />
      ) : (
        <Campo
          rotulo="Escreva ou cole a receita"
          value={texto}
          onChangeText={setTexto}
          multiline
          placeholder={'Bolo de fubá\n2 xícaras de fubá\n3 ovos\nBata tudo no liquidificador.'}
          style={{ minHeight: 280 }}
        />
      )}
    </Tela>
  );
}
