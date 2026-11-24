import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Receita } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { cores, espaco, fontes, raios, sombras, tamanhos } from '../ui/tokens.ts';

/**
 * RF01. Por enquanto só lê o livro do SQLite (prova de que banco, casos de uso e tokens estão ligados).
 * shortcut: grade de cards, busca e botões entram na etapa das telas.
 */
export function TelaLivro() {
  const { consultar } = useDependencias();
  const [nome, setNome] = useState('');
  const [receitas, setReceitas] = useState<Receita[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      consultar.livro().then((l) => setNome(l.nome));
      consultar.listar().then(setReceitas);
    }, [consultar]),
  );

  const total = receitas?.length ?? 0;
  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.rotulo}>De Casa, o caderninho da família</Text>
        <Text style={estilos.titulo} accessibilityRole="header">{nome}</Text>
        {receitas && (
          <Text style={estilos.subtitulo}>
            {total === 1 ? '1 receita guardada' : `${total} receitas guardadas`} neste aparelho
          </Text>
        )}

        {receitas?.length === 0 && (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTitulo}>O caderninho ainda está em branco</Text>
            <Text style={estilos.vazioTexto}>Grave, fotografe ou escreva a primeira receita da família.</Text>
          </View>
        )}

        {receitas?.map((r) => (
          <View key={r.id} style={estilos.card}>
            <Text style={estilos.cardTitulo}>{r.titulo}</Text>
            {r.autorNome && <Text style={estilos.cardAutor}>por {r.autorNome}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.farinha },
  conteudo: { padding: espaco.tela, gap: espaco[4] },
  rotulo: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloM, color: cores.terracota },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.display, color: cores.cafe },
  subtitulo: { fontFamily: fontes.corpoMedio, fontSize: tamanhos.pequeno, color: cores.cafeSuave },
  vazio: {
    marginTop: espaco[22], padding: espaco[22], gap: espaco[8], borderRadius: raios.card,
    backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, ...sombras.card,
  },
  vazioTitulo: { fontFamily: fontes.tituloMedio, fontSize: tamanhos.tituloS, color: cores.cafe },
  vazioTexto: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 24, color: cores.cafeSuave },
  card: {
    marginTop: espaco[12], padding: espaco[16], borderRadius: raios.card,
    backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, ...sombras.card,
  },
  cardTitulo: { fontFamily: fontes.tituloMedio, fontSize: tamanhos.tituloS, color: cores.cafe },
  cardAutor: { fontFamily: fontes.corpo, fontSize: tamanhos.pequeno, color: cores.cafeSuave },
});
