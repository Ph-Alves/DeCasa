import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, espaco, fontes, raios, tamanhos, toque } from '../ui/tokens.ts';

/**
 * RF12. Com rendimento informado mostra porções; sem ele, "vezes a receita".
 * Só muda a visualização: a receita salva não é alterada.
 */
export function SeletorDePorcoes({ valor, aoMudar, temRendimento }: { valor: number; aoMudar: (n: number) => void; temRendimento: boolean }) {
  const rotulo = temRendimento ? `${valor} ${valor === 1 ? 'porção' : 'porções'}` : `${valor}× a receita`;
  return (
    <View style={estilos.linha} accessibilityRole="adjustable" accessibilityLabel={rotulo}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => aoMudar(e.nativeEvent.actionName === 'increment' ? valor + 1 : Math.max(1, valor - 1))}
    >
      <Pressable onPress={() => aoMudar(Math.max(1, valor - 1))} disabled={valor <= 1} style={[estilos.botao, valor <= 1 && { opacity: 0.35 }]}
        accessibilityRole="button" accessibilityLabel="Diminuir">
        <MaterialCommunityIcons name="minus" size={22} color={cores.cafe} />
      </Pressable>
      <Text style={estilos.valor}>{rotulo}</Text>
      <Pressable onPress={() => aoMudar(valor + 1)} style={estilos.botao} accessibilityRole="button" accessibilityLabel="Aumentar">
        <MaterialCommunityIcons name="plus" size={22} color={cores.cafe} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco[12],
    padding: espaco[6], borderRadius: raios.pilula56, backgroundColor: cores.papel,
  },
  botao: {
    width: toque.minimo, height: toque.minimo, borderRadius: toque.minimo / 2,
    backgroundColor: cores.cartao, alignItems: 'center', justifyContent: 'center',
  },
  valor: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.cafe },
});
