import { useAudioRecorder } from 'expo-audio';
import { launchCameraAsync, launchImageLibraryAsync, type ImagePickerOptions } from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { rascunhoDoTexto } from '../../domain/parser/texto-para-receita.ts';
import { rascunhoVazio, type Midia } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { GravadorDeVoz } from '../captura/gravador-de-voz.tsx';
import { Abas, Botao, Cabecalho, Campo, Tela } from '../ui/componentes.tsx';
import { cores, fontes, tamanhos } from '../ui/tokens.ts';
import { abrirRevisao, perguntar } from './abrir-revisao.ts';

type Aba = 'voz' | 'foto' | 'texto';

// A foto vira mídia da receita: qualidade boa para ler, sem pesar no aparelho (RNF04).
const OPCOES_DA_FOTO: ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };

/**
 * RF03, RF04 e RF05. Voz é a aba padrão: do livro até gravar são 2 toques (RNF06).
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
  // Saiu no meio da transcrição: para o reconhecedor.
  const transcricao = useRef<AbortController | null>(null);
  useEffect(() => () => {
    transcricao.current?.abort();
    if (pendente.current) voz.descartar(pendente.current);
  }, [voz]);

  /** RF05: fotografar ou escolher a foto, ler o texto no aparelho e abrir a revisão com a foto ao lado. */
  async function lerFoto(origem: 'camera' | 'galeria') {
    if (origem === 'camera' && (await deps.capturaPorFoto.pedirCamera()) === 'negada') {
      await perguntar('Sem acesso à câmera', 'Libere a câmera para o De Casa nos Ajustes, ou escolha uma foto que já está no aparelho.', [{ texto: 'Entendi' }]);
      return;
    }
    setOcupado(true);
    try {
      const escolha = origem === 'camera' ? await launchCameraAsync(OPCOES_DA_FOTO) : await launchImageLibraryAsync(OPCOES_DA_FOTO);
      if (escolha.canceled) return;
      const { rascunho, problema } = await deps.capturaPorFoto.extrair(escolha.assets[0].uri);
      if (problema === 'falhou') {
        await perguntar('Não deu para ler a foto', 'A foto vai para a revisão e você escreve a receita olhando para ela.', [{ texto: 'Continuar' }]);
      }
      if (!(await abrirRevisao(deps.rascunho, rascunho))) await deps.capturaPorFoto.descartar(rascunho);
    } catch (e) {
      // Ex.: simulador sem câmera.
      await perguntar('Não foi possível abrir a foto', e instanceof Error ? e.message : String(e), [{ texto: 'Entendi' }]);
    } finally {
      setOcupado(false);
    }
  }

  async function continuar() {
    setOcupado(true);
    if (aba === 'voz' && audio) {
      transcricao.current = new AbortController();
      const { rascunho, problema } = await voz.transcrever(audio, { signal: transcricao.current.signal });
      if (problema === 'cancelada') return;
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
  const acao = aba === 'foto'
    ? <Botao icone="camera" titulo={ocupado ? 'Lendo a foto...' : 'Tirar foto da receita'} aoTocar={() => lerFoto('camera')} desativado={ocupado} />
    : <Botao titulo={ocupado && aba === 'voz' ? 'Transformando o áudio em texto...' : 'Continuar: ingredientes e passos'}
        aoTocar={continuar} desativado={!podeContinuar || ocupado} />;
  return (
    <Tela acao={acao}>
      <Cabecalho titulo="Nova receita" rotulo="como a vó prefere contar?" />
      <Abas<Aba>
        opcoes={[{ valor: 'voz', titulo: 'Voz' }, { valor: 'foto', titulo: 'Foto' }, { valor: 'texto', titulo: 'Texto' }]}
        valor={aba}
        aoMudar={setAba}
      />

      {aba === 'voz' ? (
        <GravadorDeVoz gravador={gravador} voz={voz} audio={audio} aoMudarAudio={setAudio} aoPreferirTexto={() => setAba('texto')} />
      ) : aba === 'foto' ? (
        <>
          <Text style={estilos.explicacao}>
            Fotografe a receita escrita no caderno ou num papel, com boa luz e a folha inteira aparecendo. O texto é lido aqui
            mesmo no aparelho e você confere tudo antes de salvar.
          </Text>
          <Botao tipo="secundario" icone="image-outline" titulo="Escolher foto do aparelho" aoTocar={() => lerFoto('galeria')} desativado={ocupado} />
        </>
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

const estilos = StyleSheet.create({
  explicacao: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 26, color: cores.cafeSuave },
});
