import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cores, espaco, fontes, raios, sombras, tamanhos, toque } from './tokens.ts';

/** Fundo Farinha, margem de 24 e ação principal fixa embaixo (uma por tela). */
export function Tela({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
      {acao && <View style={estilos.rodape}>{acao}</View>}
    </SafeAreaView>
  );
}

export function Cabecalho({ titulo, rotulo, aoVoltar = () => router.back() }: { titulo: string; rotulo?: string; aoVoltar?: () => void }) {
  return (
    <View style={estilos.cabecalho}>
      <Pressable onPress={aoVoltar} style={estilos.voltar} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}>
        <Text style={estilos.voltarIcone}>←</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        {rotulo && <Text style={estilos.rotulo}>{rotulo}</Text>}
        <Text style={estilos.titulo} accessibilityRole="header">{titulo}</Text>
      </View>
    </View>
  );
}

type BotaoProps = {
  titulo: string;
  aoTocar: () => void;
  tipo?: 'principal' | 'secundario' | 'perigo';
  desativado?: boolean;
  rotuloAcessivel?: string;
  estilo?: StyleProp<ViewStyle>;
};

/** Principal: pílula Terracota de 56. Secundário: contorno Café de 44. Perigo: texto Terracota (excluir). */
export function Botao({ titulo, aoTocar, tipo = 'principal', desativado, rotuloAcessivel, estilo }: BotaoProps) {
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityState={{ disabled: !!desativado }}
      style={({ pressed }) => [estilos[tipo], desativado && { opacity: 0.35 }, pressed && { opacity: 0.8 }, estilo]}
    >
      <Text style={estilos[`${tipo}Texto`]}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo({ rotulo, ...props }: { rotulo: string } & TextInputProps) {
  return (
    <View style={{ gap: espaco[6] }}>
      <Text style={estilos.campoRotulo}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={cores.cafeSuave}
        {...props}
        style={[estilos.campo, props.multiline && estilos.campoLongo, props.style]}
      />
    </View>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <View style={estilos.aviso} accessibilityRole="alert">
      <Text style={estilos.avisoTexto}>{children}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.farinha },
  conteudo: { padding: espaco.tela, gap: espaco[16], paddingBottom: espaco.tela * 2 },
  rodape: { paddingHorizontal: espaco.tela, paddingTop: espaco[8], paddingBottom: espaco[8], backgroundColor: cores.farinha },

  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco[12] },
  voltar: {
    width: toque.minimo, height: toque.minimo, borderRadius: toque.minimo / 2,
    backgroundColor: cores.papel, alignItems: 'center', justifyContent: 'center',
  },
  voltarIcone: { fontFamily: fontes.corpoForte, fontSize: tamanhos.tituloS, color: cores.cafe },
  rotulo: { fontFamily: fontes.manuscrito, fontSize: tamanhos.tituloS, color: cores.terracota },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.tituloM, color: cores.cafe },

  principal: {
    minHeight: toque.acao, borderRadius: raios.pilula56, paddingHorizontal: espaco[22],
    backgroundColor: cores.terracota, alignItems: 'center', justifyContent: 'center', ...sombras.acao,
  },
  principalTexto: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.cartao },
  secundario: {
    minHeight: toque.minimo, borderRadius: raios.pilula44, paddingHorizontal: espaco[16],
    borderWidth: 1.5, borderColor: cores.cafe, alignItems: 'center', justifyContent: 'center',
  },
  secundarioTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.pequeno, color: cores.cafe },
  perigo: { minHeight: toque.minimo, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espaco[16] },
  perigoTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.pequeno, color: cores.terracota },

  campoRotulo: { fontFamily: fontes.corpoForte, fontSize: tamanhos.pequeno, color: cores.cafe },
  campo: {
    minHeight: toque.minimo, borderRadius: raios.campo, borderWidth: 1.5, borderColor: cores.bordaControle,
    backgroundColor: cores.cartao, paddingVertical: espaco[12], paddingHorizontal: espaco[14],
    fontFamily: fontes.corpo, fontSize: tamanhos.corpo, color: cores.cafe,
  },
  campoLongo: { minHeight: 140, lineHeight: 24, textAlignVertical: 'top' },

  aviso: { backgroundColor: cores.mostardaClara, borderRadius: raios.aviso, padding: espaco[14] },
  avisoTexto: { fontFamily: fontes.corpo, fontSize: tamanhos.pequeno, lineHeight: 21, color: cores.cafe },
});
