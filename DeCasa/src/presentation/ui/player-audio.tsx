import { MaterialCommunityIcons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, espaco, fontes, raios, tamanhos, toque } from './tokens.ts';

export function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** RF09: tocar, pausar e progresso com tempo atual e total (design system, página 6). */
export function PlayerDeAudio({ uri, titulo }: { uri: string; titulo: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  // Ao terminar, volta para o começo para dar para ouvir de novo.
  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  async function alternar() {
    if (status.playing) return player.pause();
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    player.play();
  }

  const progresso = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  return (
    <View style={estilos.player}>
      <Pressable
        onPress={alternar}
        style={estilos.botao}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar áudio' : 'Tocar áudio'}
        disabled={!status.isLoaded}
      >
        <MaterialCommunityIcons name={status.playing ? 'pause' : 'play'} size={26} color={cores.cartao} />
      </Pressable>
      <View style={{ flex: 1, gap: espaco[6] }}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <View style={estilos.trilho} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progresso * 100) }}>
          <View style={[estilos.progresso, { width: `${progresso * 100}%` }]} />
        </View>
        <Text style={estilos.tempo}>{formatarTempo(status.currentTime)} de {formatarTempo(status.duration)}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  player: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[14], padding: espaco[14],
    borderRadius: raios.card, backgroundColor: cores.mostardaClara,
  },
  botao: {
    width: toque.minimo, height: toque.minimo, borderRadius: toque.minimo / 2,
    backgroundColor: cores.terracota, alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.cafe },
  trilho: { height: 6, borderRadius: 3, backgroundColor: cores.linhaCaderno, overflow: 'hidden' },
  progresso: { height: 6, backgroundColor: cores.terracota },
  tempo: { fontFamily: fontes.corpoMedio, fontSize: tamanhos.legenda, color: cores.cafeSuave },
});
