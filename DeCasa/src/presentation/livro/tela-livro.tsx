import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { correspondeBusca, type Rascunho, type Receita } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Aviso, BARRA_DO_TECLADO, Botao, Tela, Xadrez } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, sombras, tamanhos, toque } from '../ui/tokens.ts';

const CORES_DO_TILE = [cores.papel, cores.salviaClara, cores.mostardaClara];
const ALTURA_DO_TILE = 120;

/** RF01, RF02 e RF03 (rascunho pendente). */
export function TelaLivro() {
  const { consultar, rascunho, compras } = useDependencias();
  const [nome, setNome] = useState('');
  const [receitas, setReceitas] = useState<Receita[] | null>(null);
  const [pendente, setPendente] = useState<Rascunho | null>(null);
  const [busca, setBusca] = useState('');
  const [faltam, setFaltam] = useState(0);

  useFocusEffect(
    useCallback(() => {
      consultar.livro().then((l) => setNome(l.nome));
      consultar.listar().then(setReceitas);
      rascunho.recuperar().then(setPendente);
      compras.listar().then((itens) => setFaltam(itens.filter((i) => !i.comprado).length));
    }, [consultar, rascunho, compras]),
  );

  async function descartarPendente() {
    if (pendente) await rascunho.descartar(pendente);
    setPendente(null);
  }

  // Busca em memória: o livro já está carregado e o domínio ignora acento (RF02).
  const visiveis = receitas?.filter((r) => correspondeBusca(r, busca)) ?? [];
  const total = receitas?.length ?? 0;

  return (
    <Tela acao={<Botao icone="plus" titulo="Nova receita" aoTocar={() => router.push('/nova')} estilo={{ alignSelf: 'center' }} />}>
      <View style={estilos.topo}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.rotulo}>De Casa, o caderninho da família</Text>
          <Text style={estilos.titulo} accessibilityRole="header">{nome}</Text>
          {receitas && (
            <Text style={estilos.subtitulo}>
              {total === 1 ? '1 receita guardada' : `${total} receitas guardadas`} neste aparelho
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/compras')}
          style={estilos.carrinho}
          accessibilityRole="button"
          accessibilityLabel={faltam ? `Lista de compras, ${faltam} ${faltam === 1 ? 'item que falta' : 'itens que faltam'}` : 'Lista de compras'}
        >
          <MaterialCommunityIcons name="cart-outline" size={22} color={cores.cafe} />
          {faltam > 0 && (
            <View style={estilos.contador}>
              <Text style={estilos.contadorTexto}>{faltam}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={estilos.linha}>
        <Botao tipo="secundario" icone="tray-arrow-down" titulo="Importar PDF" aoTocar={() => router.push('/importar')} estilo={{ flex: 1 }} />
        {total > 0 && <Botao tipo="secundario" icone="tray-arrow-up" titulo="Exportar livro" aoTocar={() => router.push('/exportar')} estilo={{ flex: 1 }} />}
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
          inputAccessoryViewID={BARRA_DO_TECLADO}
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
  const { uriDaMidia } = useDependencias();
  const foto = receita.midias.find((m) => m.tipo === 'foto');
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
      <View style={estilos.tile}>
        {foto ? (
          <Image source={{ uri: uriDaMidia(foto.caminhoLocal) }} style={estilos.tile} />
        ) : (
          <Xadrez cor={cor} altura={ALTURA_DO_TILE}>
            <View style={estilos.inicial}>
              <Text style={estilos.inicialTexto}>{receita.titulo.trim().charAt(0).toUpperCase()}</Text>
            </View>
          </Xadrez>
        )}
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
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco[12] },
  carrinho: {
    width: toque.minimo, height: toque.minimo, borderRadius: toque.minimo / 2, marginTop: espaco[4],
    backgroundColor: cores.papel, alignItems: 'center', justifyContent: 'center',
  },
  contador: {
    position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: cores.terracota, alignItems: 'center', justifyContent: 'center',
  },
  contadorTexto: { fontFamily: fontes.corpoForte, fontSize: 11, color: cores.cartao },
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
  tile: { width: '100%', height: ALTURA_DO_TILE },
  inicial: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: cores.farinha,
    alignItems: 'center', justifyContent: 'center',
  },
  inicialTexto: { fontFamily: fontes.manuscrito, fontSize: tamanhos.display, color: cores.cafe },
  tagAudio: {
    position: 'absolute', left: espaco[8], bottom: espaco[8], flexDirection: 'row', alignItems: 'center', gap: espaco[4],
    backgroundColor: cores.farinha, borderRadius: raios.campo, paddingHorizontal: espaco[8], paddingVertical: espaco[2],
  },
  tagAudioTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.legenda, color: cores.cafe },
  cardTexto: { padding: espaco[12], gap: espaco[2] },
  cardTitulo: { fontFamily: fontes.titulo, fontSize: tamanhos.corpo + 1, color: cores.cafe },
  cardAutor: { fontFamily: fontes.corpo, fontSize: tamanhos.legenda, color: cores.cafeSuave },
});
