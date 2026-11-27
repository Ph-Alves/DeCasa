import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { escalar } from '../../domain/porcoes/escalar.ts';
import { receitaParaRascunho, type Receita } from '../../domain/receita/receita.ts';
import { textoDoIngrediente } from '../../domain/parser/texto-para-receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Botao, BotaoVoltar, Cabecalho, Tela } from '../ui/componentes.tsx';
import { PlayerDeAudio } from '../ui/player-audio.tsx';
import { cores, espaco, fontes, raios, sombras, tamanhos } from '../ui/tokens.ts';
import { abrirRevisao, perguntar } from './abrir-revisao.ts';
import { SeletorDePorcoes } from './seletor-de-porcoes.tsx';

const PAUTA = 40;
const ALTURA_DA_FOTO = 240;

/** RF09, RF10, RF12 e RF13. */
export function TelaReceita({ id }: { id: string }) {
  const { consultar, rascunho, excluir, compras, uriDaMidia } = useDependencias();
  const [receita, setReceita] = useState<Receita | null | undefined>(undefined);
  const [porcoes, setPorcoes] = useState(1);
  const topo = useSafeAreaInsets().top;

  useFocusEffect(
    useCallback(() => {
      consultar.ver(id).then((r) => {
        setReceita(r);
        setPorcoes(r?.rendimentoPorcoes ?? 1);
      });
    }, [consultar, id]),
  );

  async function adicionarNaLista() {
    if (!receita) return;
    await compras.adicionarReceita(receita, porcoes);
    const escolha = await perguntar('Na lista de compras', `Os ingredientes de "${receita.titulo}" foram para a lista.`, [
      { texto: 'Ver lista' }, { texto: 'Ok', estilo: 'cancel' },
    ]);
    if (escolha === 0) router.push('/compras');
  }

  async function confirmarExclusao() {
    if (!receita) return;
    const escolha = await perguntar(
      'Excluir esta receita?',
      `"${receita.titulo}" e o áudio e as fotos dela saem do aparelho. Não dá para desfazer.`,
      [{ texto: 'Cancelar', estilo: 'cancel' }, { texto: 'Excluir', estilo: 'destructive' }],
    );
    if (escolha !== 1) return;
    await excluir.executar(receita.id);
    router.back();
  }

  if (receita === undefined) return null;
  if (receita === null) {
    return (
      <Tela>
        <Cabecalho titulo="Receita não encontrada" />
      </Tela>
    );
  }

  const audio = receita.midias.find((m) => m.tipo === 'audio');
  const foto = receita.midias.find((m) => m.tipo === 'foto');
  const base = receita.rendimentoPorcoes ?? 1;
  const ingredientes = escalar(receita.ingredientes, base, porcoes);
  return (
    <Tela
      acao={<Botao icone="pot-steam" titulo="Cozinhar agora" aoTocar={() => router.push(`/cozinha/${receita.id}?porcoes=${porcoes}`)} />}
      capa={foto && (
        <View>
          <Image source={{ uri: uriDaMidia(foto.caminhoLocal) }} style={estilos.foto} accessibilityLabel={`Foto da receita ${receita.titulo}`} />
          <BotaoVoltar estilo={[estilos.voltarNaFoto, { top: topo + espaco[8] }]} />
        </View>
      )}
    >
      {!foto && <Cabecalho titulo="" />}
      <View style={[estilos.capa, foto && estilos.capaSobreFoto]}>
        <Text style={estilos.rotulo}>receita da família</Text>
        <Text style={estilos.titulo} accessibilityRole="header">{receita.titulo}</Text>
        {receita.autorNome && <Text style={estilos.autor}>por <Text style={estilos.autorNome}>{receita.autorNome}</Text></Text>}
      </View>

      {audio && <PlayerDeAudio uri={uriDaMidia(audio.caminhoLocal)} titulo="Ouvir o áudio da vó" />}

      <View style={estilos.linhaSecao}>
        <Text style={estilos.secao} accessibilityRole="header">Ingredientes</Text>
        <SeletorDePorcoes valor={porcoes} aoMudar={setPorcoes} temRendimento={receita.rendimentoPorcoes !== null} />
      </View>
      <View style={estilos.caderno}>
        <View style={estilos.margem} />
        {ingredientes.map((i) => (
          <Text key={i.id} style={estilos.pauta}>{textoDoIngrediente(i)}</Text>
        ))}
      </View>
      <Botao tipo="secundario" icone="cart-plus" titulo="Adicionar à lista de compras" aoTocar={adicionarNaLista} />

      <Text style={estilos.secao} accessibilityRole="header">Modo de preparo</Text>
      <View style={{ gap: espaco[14] }}>
        {receita.passos.map((p, n) => (
          <View key={p.id} style={estilos.passo}>
            <View style={estilos.numero}><Text style={estilos.numeroTexto}>{n + 1}</Text></View>
            <Text style={estilos.passoTexto}>{p.texto}</Text>
          </View>
        ))}
      </View>

      {receita.pontoObs && <Observacao titulo="Ponto da massa" texto={receita.pontoObs} />}
      {receita.quandoFaz && <Observacao titulo="Quando faz" texto={receita.quandoFaz} />}

      <View style={estilos.acoes}>
        <Botao tipo="secundario" icone="pencil-outline" titulo="Editar receita" aoTocar={() => abrirRevisao(rascunho, receitaParaRascunho(receita))} />
        <Botao tipo="perigo" titulo="Excluir receita" aoTocar={confirmarExclusao} />
      </View>
    </Tela>
  );
}

function Observacao({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={{ gap: espaco[4] }}>
      <Text style={estilos.obsTitulo}>{titulo}</Text>
      <Text style={estilos.passoTexto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: { width: '100%', height: ALTURA_DA_FOTO, backgroundColor: cores.papel },
  voltarNaFoto: { position: 'absolute', left: espaco[22], backgroundColor: cores.farinha, ...sombras.card },
  // O cartão do título sobe 44 sobre a foto (protótipo, Ver receita).
  capaSobreFoto: { marginTop: -(44 + espaco.tela) },
  capa: {
    alignItems: 'center', gap: espaco[4], padding: espaco[22], borderRadius: raios.card,
    backgroundColor: cores.cartao, ...sombras.flutuante,
  },
  rotulo: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloS, color: cores.terracota },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.tituloL, color: cores.cafe, textAlign: 'center' },
  autor: { fontFamily: fontes.corpo, fontSize: tamanhos.pequeno, color: cores.cafeSuave },
  autorNome: { fontFamily: fontes.corpoNegrito, color: cores.cafe },
  linhaSecao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco[8], marginTop: espaco[8] },
  secao: { fontFamily: fontes.titulo, fontSize: tamanhos.tituloM, color: cores.cafe },
  // Caderno pautado: linha de margem rosada e uma pauta por ingrediente, de ponta a ponta.
  caderno: {
    backgroundColor: cores.cartao, borderRadius: raios.caderno, borderWidth: 1, borderColor: cores.borda,
    paddingTop: espaco[6], ...sombras.card,
  },
  margem: { position: 'absolute', left: 38, top: 0, bottom: 0, width: 1.5, backgroundColor: '#D98E7E' },
  pauta: {
    minHeight: PAUTA, paddingVertical: espaco[6], paddingLeft: 52, paddingRight: espaco[16],
    borderBottomWidth: 1, borderBottomColor: cores.linhaCaderno,
    fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloM, color: cores.cafe,
  },
  passo: { flexDirection: 'row', gap: espaco[12], alignItems: 'flex-start' },
  numero: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: cores.salviaEscura,
    alignItems: 'center', justifyContent: 'center',
  },
  numeroTexto: { fontFamily: fontes.corpoForte, fontSize: tamanhos.pequeno, color: cores.cartao },
  passoTexto: { flex: 1, fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 24, color: cores.cafe },
  obsTitulo: { fontFamily: fontes.corpoForte, fontSize: tamanhos.pequeno, color: cores.cafe },
  acoes: { marginTop: espaco[16], gap: espaco[8] },
});
