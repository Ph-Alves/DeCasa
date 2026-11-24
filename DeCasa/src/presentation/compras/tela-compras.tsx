import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { textoDoItem } from '../../application/usecases/lista-de-compras.ts';
import type { ItemCompra } from '../../domain/compras/item-compra.ts';
import { ingredienteDaLinha } from '../../domain/parser/texto-para-receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { perguntar } from '../receita/abrir-revisao.ts';
import { Botao, Cabecalho, Tela } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, tamanhos, toque } from '../ui/tokens.ts';

/** RF13: marcar, remover, adicionar item solto, limpar e compartilhar como texto. Itens iguais se somam (RN04). */
export function TelaCompras() {
  const { compras } = useDependencias();
  const [itens, setItens] = useState<ItemCompra[] | null>(null);
  const [novo, setNovo] = useState('');

  useFocusEffect(
    useCallback(() => {
      compras.listar().then(setItens);
    }, [compras]),
  );

  async function adicionar() {
    // "2 kg de açúcar" vira quantidade, unidade e nome, como na revisão.
    const i = ingredienteDaLinha(novo);
    if (!i) return;
    setItens(await compras.adicionarItem(i.nome, i.quantidade.valor, i.unidade));
    setNovo('');
  }

  async function limpar() {
    const escolha = await perguntar('Limpar a lista?', 'Todos os itens saem da lista.', [
      { texto: 'Cancelar', estilo: 'cancel' }, { texto: 'Limpar', estilo: 'destructive' },
    ]);
    if (escolha === 1) setItens(await compras.limpar());
  }

  if (!itens) return null;
  const faltam = itens.filter((i) => !i.comprado).length;

  return (
    <Tela acao={itens.length > 0 && <Botao icone="share-variant" titulo="Compartilhar lista" aoTocar={() => compras.compartilhar()} />}>
      <Cabecalho titulo="Lista de compras" rotulo={itens.length ? `faltam ${faltam} de ${itens.length}` : undefined} />

      <View style={estilos.adicionar}>
        <TextInput
          value={novo}
          onChangeText={setNovo}
          onSubmitEditing={adicionar}
          placeholder="Adicionar item (ex.: 1 kg de açúcar)"
          placeholderTextColor={cores.cafeSuave}
          accessibilityLabel="Adicionar item"
          returnKeyType="done"
          style={estilos.campo}
        />
        <Pressable onPress={adicionar} style={estilos.mais} accessibilityRole="button" accessibilityLabel="Adicionar item à lista">
          <MaterialCommunityIcons name="plus" size={24} color={cores.cartao} />
        </Pressable>
      </View>

      {itens.length === 0 ? (
        <Text style={estilos.vazio}>A lista está vazia. Na receita, toque em "Adicionar à lista de compras" ou escreva um item acima.</Text>
      ) : (
        <View style={estilos.lista}>
          {itens.map((i) => (
            <View key={i.id} style={estilos.linha}>
              <Pressable
                onPress={async () => setItens(await compras.marcar(i.id, !i.comprado))}
                style={estilos.marcar}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: i.comprado }}
                accessibilityLabel={textoDoItem(i)}
              >
                <MaterialCommunityIcons
                  name={i.comprado ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={26}
                  color={i.comprado ? cores.salviaEscura : cores.bordaControle}
                />
                <Text style={[estilos.item, i.comprado && estilos.comprado]}>{textoDoItem(i)}</Text>
              </Pressable>
              <Pressable onPress={async () => setItens(await compras.remover(i.id))} style={estilos.remover}
                accessibilityRole="button" accessibilityLabel={`Remover ${i.nome}`}>
                <MaterialCommunityIcons name="close" size={20} color={cores.cafeSuave} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {itens.length > 0 && <Botao tipo="perigo" titulo="Limpar lista" aoTocar={limpar} />}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  adicionar: { flexDirection: 'row', gap: espaco[8], alignItems: 'center' },
  campo: {
    flex: 1, minHeight: toque.minimo, borderRadius: raios.campo, borderWidth: 1.5, borderColor: cores.bordaControle,
    backgroundColor: cores.cartao, paddingHorizontal: espaco[14], fontFamily: fontes.corpo, fontSize: tamanhos.corpo, color: cores.cafe,
  },
  mais: {
    width: toque.minimo, height: toque.minimo, borderRadius: toque.minimo / 2,
    backgroundColor: cores.terracota, alignItems: 'center', justifyContent: 'center',
  },
  vazio: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 24, color: cores.cafeSuave },
  lista: { backgroundColor: cores.cartao, borderRadius: raios.card, borderWidth: 1, borderColor: cores.borda },
  linha: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: cores.linhaCaderno },
  marcar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco[12], minHeight: toque.linha, paddingHorizontal: espaco[14] },
  item: { flex: 1, fontFamily: fontes.corpoMedio, fontSize: tamanhos.corpo, color: cores.cafe, paddingVertical: espaco[10] },
  comprado: { color: cores.cafeSuave, textDecorationLine: 'line-through' },
  remover: { width: toque.minimo, height: toque.minimo, alignItems: 'center', justifyContent: 'center' },
});
