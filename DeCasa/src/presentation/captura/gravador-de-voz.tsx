import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioRecorderState, type AudioRecorder as GravadorDoExpo } from 'expo-audio';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CapturarPorVoz } from '../../application/usecases/capturar-por-voz.ts';
import type { Midia } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Aviso, Botao } from '../ui/componentes.tsx';
import { formatarTempo, PlayerDeAudio } from '../ui/player-audio.tsx';
import { cores, espaco, fontes, sombras, tamanhos, toque } from '../ui/tokens.ts';

type Props = {
  /** Vêm da tela: ela usa a mesma captura para transcrever ao continuar. */
  gravador: GravadorDoExpo;
  voz: CapturarPorVoz;
  audio: Midia | null;
  aoMudarAudio: (audio: Midia | null) => void;
  aoPreferirTexto: () => void;
};

/** RF04: gravar, parar, ouvir, regravar e descartar. */
export function GravadorDeVoz({ gravador, voz, audio, aoMudarAudio, aoPreferirTexto }: Props) {
  const deps = useDependencias();
  const estado = useAudioRecorderState(gravador);
  const [semPermissao, setSemPermissao] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function iniciar() {
    setOcupado(true);
    const r = await voz.iniciar();
    setSemPermissao(r === 'sem-permissao');
    setOcupado(false);
  }

  async function parar() {
    setOcupado(true);
    aoMudarAudio(await voz.parar());
    setOcupado(false);
  }

  async function descartar() {
    if (audio) await voz.descartar(audio);
    aoMudarAudio(null);
  }

  if (semPermissao) {
    return (
      <View style={{ gap: espaco[12] }}>
        <Aviso>Para gravar, o De Casa precisa do microfone. Você pode liberar nos ajustes do aparelho ou escrever a receita.</Aviso>
        <Botao tipo="secundario" titulo="Abrir ajustes" aoTocar={() => Linking.openSettings()} />
        <Botao tipo="secundario" titulo="Escrever a receita" aoTocar={aoPreferirTexto} />
      </View>
    );
  }

  if (audio) {
    return (
      <View style={{ gap: espaco[12] }}>
        <PlayerDeAudio uri={deps.uriDaMidia(audio.caminhoLocal)} titulo="Ouvir a gravação" />
        <View style={estilos.linha}>
          <Botao tipo="secundario" titulo="Gravar de novo" aoTocar={async () => { await descartar(); await iniciar(); }} />
          <Botao tipo="perigo" titulo="Descartar" aoTocar={descartar} rotuloAcessivel="Descartar a gravação" />
        </View>
      </View>
    );
  }

  const gravando = estado.isRecording;
  return (
    <View style={estilos.centro}>
      <Pressable
        onPress={gravando ? parar : iniciar}
        disabled={ocupado}
        style={[estilos.circulo, { backgroundColor: gravando ? cores.cafe : cores.terracota }]}
        accessibilityRole="button"
        accessibilityLabel={gravando ? 'Parar gravação' : 'Iniciar gravação'}
      >
        {gravando ? <View style={estilos.quadrado} /> : <MaterialCommunityIcons name="microphone" size={52} color={cores.cartao} />}
      </Pressable>
      <Text style={estilos.titulo} accessibilityLiveRegion="polite">
        {gravando ? `Gravando · ${formatarTempo(estado.durationMillis / 1000)}` : 'Toque para gravar'}
      </Text>
      <Text style={estilos.texto}>
        {gravando
          ? 'Toque de novo quando terminar.'
          : 'Fale a receita do jeito que você lembra. O áudio fica guardado junto da receita, na voz de quem sabe cozinhar.'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', gap: espaco[16], paddingVertical: espaco[22] },
  circulo: {
    width: toque.gravar, height: toque.gravar, borderRadius: toque.gravar / 2,
    alignItems: 'center', justifyContent: 'center', ...sombras.gravar,
  },
  quadrado: { width: 40, height: 40, borderRadius: 8, backgroundColor: cores.cartao },
  titulo: { fontFamily: fontes.corpoForte, fontSize: tamanhos.tituloS, color: cores.cafe },
  texto: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 24, color: cores.cafeSuave, textAlign: 'center' },
  linha: { flexDirection: 'row', gap: espaco[8], alignItems: 'center' },
});
