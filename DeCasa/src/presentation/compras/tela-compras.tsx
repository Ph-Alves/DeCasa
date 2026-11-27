import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { textoDoItem } from '../../application/usecases/lista-de-compras.ts';
import type { ItemCompra } from '../../domain/compras/item-compra.ts';
import { ingredienteDaLinha } from '../../domain/parser/texto-para-receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { perguntar } from '../receita/abrir-revisao.ts';
import { BARRA_DO_TECLADO, Botao, Cabecalho, Tela } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, sombras, tamanhos, toque } from '../ui/tokens.ts';

/** RF13: marcar, remover, adicionar item solto, limpar e compartilhar como texto. Itens iguais se somam (RN04). */
export function TelaCompras() {
  const { compras, consultar } = useDependencias();
  const [itens, setItens] = useState<ItemCompra[] | null>(null);
  const [titulos, setTitulos] = useState<Map<string, string>>(new Map());
  const [novo, setNovo] = useState('');

  useFocusEffect(
    useCallback(() => {
      compras.listar().then(setItens);
      // Nome da receita de origem de cada item (o item guarda só o id).
      consultar.listar().then((rs) => setTitulos(new Map(rs.map((r) => [r.id, r.titulo]))));
    }, [compras, consultar]),
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
  const comprados = itens.filter((i) => i.comprado).length;
  const origem = (i: ItemCompra) => (i.receitaOrigemId && titulos.get(i.receitaOrigemId)) || 'Item solto';
  const receitas = [...new Set(itens.flatMap((i) => (i.receitaOrigemId && titulos.get(i.receitaOrigemId)) || []))];

  return (
    <Tela acao={itens.length > 0 && <Botao icone="tray-arrow-up" titulo="Compartilhar como texto" aoTocar={() => compras.compartilhar()} />}>
      <Cabecalho titulo="Lista de compras" />
      <Text style={estilos.manuscrito}>o que falta para cozinhar</Text>

      {receitas.length > 0 && (
        <View style={estilos.chips}>
          {receitas.map((t) => <Text key={t} style={estilos.chip}>{t}</Text>)}
        </View>
      )}

      {itens.length > 0 && (
        <View style={estilos.resumo}>
          <View style={{ flex: 1, gap: espaco[6] }}>
            <Text style={estilos.resumoTexto}>{comprados} de {itens.length} comprados</Text>
            <View style={estilos.trilho} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: itens.length, now: comprados }}>
              <View style={[estilos.progresso, { width: `${(comprados / itens.length) * 100}%` }]} />
            </View>
          </View>
          <Botao tipo="secundario" titulo="Limpar comprados" desativado={comprados === 0}
            aoTocar={async () => setItens(await compras.limparComprados())} />
        </View>
      )}

      {itens.length === 0 ? (
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTitulo}>Sua lista está vazia</Text>
          <Text style={estilos.vazioTexto}>Para trazer os ingredientes de uma receita, abra a receita e toque em "Adicionar à lista de compras".</Text>
        </View>
      ) : (
        <View style={{ gap: espaco[10] }}>
          {itens.map((i) => (
            <View key={i.id} style={estilos.linha}>
              <Pressable
                onPress={async () => setItens(await compras.marcar(i.id, !i.comprado))}
                style={estilos.marcar}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: i.comprado }}
                accessibilityLabel={`${textoDoItem(i)}, ${origem(i)}`}
              >
                <View style={[estilos.anel, i.comprado && estilos.anelMarcado]}>
                  {i.comprado && <MaterialCommunityIcons name="check" size={18} color={cores.cartao} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.item, i.comprado && estilos.comprado]}>{textoDoItem(i)}</Text>
                  <Text style={estilos.origem}>{origem(i)}</Text>
                </View>
              </Pressable>
              <Pressable onPress={async () => setItens(await compras.remover(i.id))} style={estilos.remover}
                accessibilityRole="button" accessibilityLabel={`Remover ${i.nome}`}>
                <MaterialCommunityIcons name="close" size={20} color={cores.cafeSuave} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={estilos.adicionar}>
        <TextInput
          value={novo}
          onChangeText={setNovo}
          onSubmitEditing={adicionar}
          placeholder="Adicionar item solto"
          placeholderTextColor={cores.cafeSuave}
          inputAccessoryViewID={BARRA_DO_TECLADO}
          accessibilityLabel="Novo item da lista"
          returnKeyType="done"
          style={estilos.campo}
        />
        <Botao tipo="secundario" titulo="Adicionar" aoTocar={adicionar} />
      </View>

      {itens.length > 0 && <Botao tipo="perigo" titulo="Limpar a lista toda" aoTocar={limpar} />}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  manuscrito: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloS + 2, color: cores.terracota, marginTop: -espaco[4] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco[8] },
  chip: {
    backgroundColor: cores.mostardaClara, borderRadius: raios.aviso, overflow: 'hidden', paddingHorizontal: espaco[12], paddingVertical: espaco[8],
    fontFamily: fontes.corpoNegrito, fontSize: tamanhos.pequeno, color: cores.cafe,
  },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: espaco[12] },
  resumoTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.pequeno, color: cores.cafe },
  trilho: { height: 6, borderRadius: 3, backgroundColor: cores.linhaCaderno, overflow: 'hidden' },
  progresso: { height: 6, backgroundColor: cores.salviaEscura },
  vazio: { padding: espaco[22], gap: espaco[6], borderRadius: raios.card, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda },
  vazioTitulo: { fontFamily: fontes.tituloMedio, fontSize: tamanhos.tituloS, color: cores.cafe, textAlign: 'center' },
  vazioTexto: { fontFamily: fontes.corpo, fontSize: tamanhos.pequeno, lineHeight: 21, color: cores.cafeSuave, textAlign: 'center' },
  linha: {
    flexDirection: 'row', alignItems: 'center', paddingRight: espaco[4],
    backgroundColor: cores.cartao, borderRadius: raios.aviso, borderWidth: 1, borderColor: cores.borda, ...sombras.card,
  },
  marcar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco[12], minHeight: toque.acao, paddingLeft: espaco[14], paddingVertical: espaco[8] },
  anel: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: cores.bordaControle, backgroundColor: cores.cartao,
    alignItems: 'center', justifyContent: 'center',
  },
  anelMarcado: { borderColor: cores.salviaEscura, backgroundColor: cores.salviaEscura },
  item: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.corpo, lineHeight: 21, color: cores.cafe },
  comprado: { color: cores.cafeSuave, textDecorationLine: 'line-through' },
  origem: { fontFamily: fontes.corpo, fontSize: tamanhos.legenda, color: cores.cafeSuave },
  remover: { width: toque.minimo, height: toque.minimo, alignItems: 'center', justifyContent: 'center' },
  adicionar: { flexDirection: 'row', gap: espaco[10], alignItems: 'center', marginTop: espaco[6] },
  campo: {
    flex: 1, minHeight: toque.linha, borderRadius: raios.campo, borderWidth: 1.5, borderColor: cores.bordaControle,
    backgroundColor: cores.cartao, paddingHorizontal: espaco[14], fontFamily: fontes.corpo, fontSize: tamanhos.corpo, color: cores.cafe,
  },
});
