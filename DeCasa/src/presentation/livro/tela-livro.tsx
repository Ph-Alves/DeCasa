import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { correspondeBusca, type Rascunho, type Receita } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Aviso, Botao, Tela } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, sombras, tamanhos, toque } from '../ui/tokens.ts';

const CORES_DO_TILE = [cores.papel, cores.salviaClara, cores.mostardaClara];

/** RF01, RF02 e RF03 (rascunho pendente). */
export function TelaLivro() {
  const { consultar, rascunho } = useDependencias();
  const [nome, setNome] = useState('');
  const [receitas, setReceitas] = useState<Receita[] | null>(null);
  const [pendente, setPendente] = useState<Rascunho | null>(null);
  const [busca, setBusca] = useState('');

  useFocusEffect(
    useCallback(() => {
      consultar.livro().then((l) => setNome(l.nome));
      consultar.listar().then(setReceitas);
      rascunho.recuperar().then(setPendente);
    }, [consultar, rascunho]),
  );

  async function descartarPendente() {
    if (pendente) await rascunho.descartar(pendente);
    setPendente(null);
  }

  // Busca em memória: o livro já está carregado e o domínio ignora acento (RF02).
  const visiveis = receitas?.filter((r) => correspondeBusca(r, busca)) ?? [];
  const total = receitas?.length ?? 0;

  return (
    <Tela acao={<Botao icone="plus" titulo="Nova receita" aoTocar={() => router.push('/nova')} />}>
      <View>
        <Text style={estilos.rotulo}>De Casa, o caderninho da família</Text>
        <Text style={estilos.titulo} accessibilityRole="header">{nome}</Text>
        {receitas && (
          <Text style={estilos.subtitulo}>
            {total === 1 ? '1 receita guardada' : `${total} receitas guardadas`} neste aparelho
          </Text>
        )}
      </View>

      <View style={[estilos.linha, { flexWrap: 'wrap' }]}>
        {total > 0 && <Botao tipo="secundario" icone="export-variant" titulo="Exportar livro" aoTocar={() => router.push('/exportar')} />}
        <Botao tipo="secundario" icone="cart" titulo="Lista de compras" aoTocar={() => router.push('/compras')} />
        <Botao tipo="secundario" icone="file-import-outline" titulo="Importar PDF" aoTocar={() => router.push('/importar')} />
      </View>

      {pendente && (
        <View style={{ gap: espaco[8] }}>
          <Aviso>Você começou a receita "{pendente.titulo.trim() || 'sem nome'}" e ainda não salvou no livro.</Aviso>
          <View style={estilos.linha}>
            <Botao tipo="secundario" titulo="Continuar" aoTocar={() => router.push('/revisar')} />
            <Botao tipo="perigo" titulo="Descartar" aoTocar={descartarPendente} rotuloAcessivel="Descartar a receita em andamento" />
          </View>
        </View>
      )}

      {total > 0 && (
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome, quem ensinou ou ingrediente"
          placeholderTextColor={cores.cafeSuave}
          accessibilityLabel="Buscar receita"
          style={estilos.busca}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      )}

      {receitas?.length === 0 && (
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTitulo}>O caderninho ainda está em branco</Text>
          <Text style={estilos.vazioTexto}>Toque em "Nova receita" para guardar a primeira receita da família.</Text>
        </View>
      )}

      {total > 0 && visiveis.length === 0 && (
        <Text style={estilos.vazioTexto}>Nenhuma receita com "{busca}".</Text>
      )}

      <View style={estilos.grade}>
        {visiveis.map((r) => <CardDeReceita key={r.id} receita={r} />)}
      </View>
    </Tela>
  );
}

function CardDeReceita({ receita }: { receita: Receita }) {
  const temAudio = receita.midias.some((m) => m.tipo === 'audio');
  const cor = CORES_DO_TILE[receita.id.charCodeAt(0) % CORES_DO_TILE.length];
  const rotulo = [receita.titulo, receita.autorNome && `por ${receita.autorNome}`, temAudio && 'com áudio'].filter(Boolean).join(', ');

  return (
    <Pressable
      style={({ pressed }) => [estilos.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/receita/${receita.id}`)}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
    >
      {/* shortcut: o xadrez do tile precisa de SVG; por enquanto é cor lisa. */}
      <View style={[estilos.tile, { backgroundColor: cor }]}>
        <View style={estilos.inicial}>
          <Text style={estilos.inicialTexto}>{receita.titulo.trim().charAt(0).toUpperCase()}</Text>
        </View>
        {temAudio && (
          <View style={estilos.tagAudio}>
            <MaterialCommunityIcons name="microphone" size={12} color={cores.terracota} />
            <Text style={estilos.tagAudioTexto}>áudio da vó</Text>
          </View>
        )}
      </View>
      <View style={estilos.cardTexto}>
        <Text style={estilos.cardTitulo} numberOfLines={2}>{receita.titulo}</Text>
        {receita.autorNome && <Text style={estilos.cardAutor} numberOfLines={1}>por {receita.autorNome}</Text>}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloM, color: cores.terracota },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.display, color: cores.cafe },
  subtitulo: { fontFamily: fontes.corpoMedio, fontSize: tamanhos.pequeno, color: cores.cafeSuave },
  linha: { flexDirection: 'row', gap: espaco[8], alignItems: 'center' },
  busca: {
    minHeight: toque.minimo, borderRadius: raios.pilula44, borderWidth: 1.5, borderColor: cores.bordaControle,
    backgroundColor: cores.cartao, paddingHorizontal: espaco[16], fontFamily: fontes.corpo, fontSize: tamanhos.corpo, color: cores.cafe,
  },
  vazio: {
    padding: espaco[22], gap: espaco[8], borderRadius: raios.card,
    backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, ...sombras.card,
  },
  vazioTitulo: { fontFamily: fontes.tituloMedio, fontSize: tamanhos.tituloS, color: cores.cafe },
  vazioTexto: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 24, color: cores.cafeSuave },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[14] },
  card: {
    width: '47.5%', borderRadius: raios.card, backgroundColor: cores.cartao,
    borderWidth: 1, borderColor: cores.borda, overflow: 'hidden', ...sombras.card,
  },
  tile: { height: 110, alignItems: 'center', justifyContent: 'center' },
  inicial: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: cores.farinha,
    alignItems: 'center', justifyContent: 'center',
  },
  inicialTexto: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloL, color: cores.cafe },
  tagAudio: {
    position: 'absolute', left: espaco[8], bottom: espaco[8], flexDirection: 'row', alignItems: 'center', gap: espaco[4],
    backgroundColor: cores.farinha, borderRadius: raios.campo, paddingHorizontal: espaco[8], paddingVertical: espaco[2],
  },
  tagAudioTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.legenda, color: cores.cafe },
  cardTexto: { padding: espaco[12], gap: espaco[2] },
  cardTitulo: { fontFamily: fontes.titulo, fontSize: tamanhos.corpo + 1, color: cores.cafe },
  cardAutor: { fontFamily: fontes.corpo, fontSize: tamanhos.legenda, color: cores.cafeSuave },
});
