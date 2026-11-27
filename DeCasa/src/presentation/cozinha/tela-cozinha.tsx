import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { textoDoIngrediente } from '../../domain/parser/texto-para-receita.ts';
import { escalar } from '../../domain/porcoes/escalar.ts';
import type { Receita } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Botao } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, tamanhos, toque } from '../ui/tokens.ts';

/**
 * RF11: um passo por vez, letra grande, tela sempre acesa (o hook desliga ao sair).
 * RF12: os ingredientes aparecem na escala escolhida na receita.
 * shortcut: sem chips por passo, porque nenhuma tela liga ingrediente a passo ainda (plano, seção 1, ponto 5).
 */
export function TelaCozinha({ id, porcoes }: { id: string; porcoes: number }) {
  useKeepAwake();
  const { consultar } = useDependencias();
  const [receita, setReceita] = useState<Receita | null>(null);
  const [passo, setPasso] = useState(0);
  const [verIngredientes, setVerIngredientes] = useState(false);

  useEffect(() => {
    consultar.ver(id).then(setReceita);
  }, [consultar, id]);

  if (!receita) return null;
  const total = receita.passos.length;
  const ultimo = passo === total - 1;
  const ingredientes = escalar(receita.ingredientes, receita.rendimentoPorcoes ?? 1, porcoes);
  const escala = receita.rendimentoPorcoes ? `${porcoes} ${porcoes === 1 ? 'porção' : 'porções'}` : `${porcoes}× a receita`;

  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.topo}>
        <Pressable onPress={() => router.back()} style={estilos.sair} accessibilityRole="button" accessibilityLabel="Sair do modo cozinha">
          <MaterialCommunityIcons name="close" size={20} color={cores.cafe} />
          <Text style={estilos.sairTexto}>Sair</Text>
        </Pressable>
        <View style={estilos.acesa}>
          <MaterialCommunityIcons name="white-balance-sunny" size={16} color={cores.salviaEscura} />
          <Text style={estilos.acesaTexto}>Tela sempre acesa</Text>
        </View>
      </View>

      <Text style={estilos.titulo}>{receita.titulo}</Text>
      <View style={estilos.progresso} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: passo + 1 }}>
        {receita.passos.map((p, i) => (
          <View key={p.id} style={[estilos.segmento, { backgroundColor: i <= passo ? cores.terracota : cores.linhaCaderno }]} />
        ))}
      </View>
      <Text style={estilos.contador}>Passo {passo + 1} de {total}</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={estilos.miolo}>
        <Text style={estilos.passo} accessibilityLiveRegion="polite">{receita.passos[passo].texto}</Text>

        <Pressable onPress={() => setVerIngredientes(!verIngredientes)} style={estilos.alternar} accessibilityRole="button"
          accessibilityState={{ expanded: verIngredientes }}>
          <Text style={estilos.alternarTexto}>{verIngredientes ? 'Esconder ingredientes' : `Ver ingredientes · ${escala}`}</Text>
        </Pressable>
        {verIngredientes && (
          <View style={estilos.chips}>
            {ingredientes.map((i) => <Text key={i.id} style={estilos.chip}>{textoDoIngrediente(i)}</Text>)}
          </View>
        )}
      </ScrollView>

      <View style={estilos.botoes}>
        <Botao tipo="secundario" grande titulo="Voltar" aoTocar={() => setPasso(passo - 1)} desativado={passo === 0} estilo={{ flex: 1 }} />
        <Botao
          grande
          titulo={ultimo ? 'Terminei' : 'Próximo'}
          aoTocar={() => (ultimo ? router.back() : setPasso(passo + 1))}
          estilo={{ flex: 2 }}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.farinha, paddingHorizontal: espaco.tela, gap: espaco[10] },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: espaco[8] },
  sair: {
    flexDirection: 'row', alignItems: 'center', gap: espaco[6], minHeight: toque.minimo,
    paddingHorizontal: espaco[16], borderRadius: raios.pilula44, backgroundColor: cores.papel,
  },
  sairTexto: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.cafe },
  acesa: { flexDirection: 'row', alignItems: 'center', gap: espaco[4] },
  acesaTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.pequeno, color: cores.cafeSuave },
  titulo: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloM, color: cores.terracota, marginTop: espaco[12] },
  progresso: { flexDirection: 'row', gap: espaco[6] },
  segmento: { flex: 1, height: 8, borderRadius: 4 },
  contador: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.cafeSuave },
  miolo: { flexGrow: 1, justifyContent: 'center', gap: espaco[22], paddingVertical: espaco[22] },
  // RF11: no mínimo 28 pt; 40 do design system, crescendo com a fonte do sistema.
  passo: { fontFamily: fontes.tituloMedio, fontSize: tamanhos.cozinha, lineHeight: 50, color: cores.cafe },
  alternar: { minHeight: toque.minimo, justifyContent: 'center' },
  alternarTexto: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.salviaEscura, textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[8] },
  chip: {
    backgroundColor: cores.mostardaClara, borderRadius: raios.aviso, paddingHorizontal: espaco[14], paddingVertical: espaco[8],
    fontFamily: fontes.corpoForte, fontSize: tamanhos.tituloS, color: cores.cafe, overflow: 'hidden',
  },
  botoes: { flexDirection: 'row', gap: espaco[12], paddingBottom: espaco[8] },
});
