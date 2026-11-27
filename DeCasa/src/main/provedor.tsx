import { SplashScreen } from 'expo-router';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { abrirBanco } from '../adapters/persistence/conexao.ts';
import { cores, espaco, fontes, tamanhos } from '../presentation/ui/tokens.ts';
import { criarDependencias, type Dependencias } from './dependencias.ts';

const Contexto = createContext<Dependencias | null>(null);

/** Abre o banco uma vez e entrega os casos de uso às telas. A splash fica até o banco estar pronto. */
export function ProvedorDeDependencias({ children }: { children: ReactNode }) {
  const [deps, setDeps] = useState<Dependencias | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    abrirBanco()
      .then((banco) => setDeps(criarDependencias(banco)))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (erro) {
    return (
      <View style={estilos.erro}>
        <Text style={estilos.titulo}>Não foi possível abrir o livro</Text>
        <Text style={estilos.texto}>Feche e abra o app de novo. Suas receitas continuam guardadas no aparelho.</Text>
        <Text style={estilos.detalhe}>{erro}</Text>
      </View>
    );
  }
  if (!deps) return null;
  return <Contexto value={deps}>{children}</Contexto>;
}

export function useDependencias(): Dependencias {
  const deps = use(Contexto);
  if (!deps) throw new Error('useDependencias fora do ProvedorDeDependencias');
  return deps;
}

const estilos = StyleSheet.create({
  erro: { flex: 1, justifyContent: 'center', padding: espaco.tela, gap: espaco[12], backgroundColor: cores.farinha },
  titulo: { fontFamily: fontes.titulo, fontSize: tamanhos.tituloM, color: cores.cafe },
  texto: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, color: cores.cafe },
  detalhe: { fontFamily: fontes.corpo, fontSize: tamanhos.legenda, color: cores.cafeSuave },
});
