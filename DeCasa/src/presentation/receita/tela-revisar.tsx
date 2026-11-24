import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { ingredienteDaLinha, textoDoIngrediente } from '../../domain/parser/texto-para-receita.ts';
import type { Rascunho } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Aviso, Botao, Cabecalho, Campo, Tela } from '../ui/componentes.tsx';
import { formatarTempo, PlayerDeAudio } from '../ui/player-audio.tsx';
import { cores, espaco, fontes, tamanhos } from '../ui/tokens.ts';
import { perguntar } from './abrir-revisao.ts';

/** O que a pessoa edita: tudo texto, como no caderno. Ingredientes e passos são um por linha (RF03). */
type Formulario = {
  titulo: string; autor: string; porcoes: string; ingredientes: string; passos: string;
  ponto: string; quandoFaz: string; naoClassificado: string;
};

function paraFormulario(r: Rascunho): Formulario {
  return {
    titulo: r.titulo,
    autor: r.autorNome ?? '',
    porcoes: r.rendimentoPorcoes?.toString() ?? '',
    ingredientes: r.ingredientes.map(textoDoIngrediente).join('\n'),
    passos: r.passos.join('\n'),
    ponto: r.pontoObs ?? '',
    quandoFaz: r.quandoFaz ?? '',
    naoClassificado: r.naoClassificado.join('\n'),
  };
}

function paraRascunho(base: Rascunho, f: Formulario): Rascunho {
  const linhas = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    ...base,
    titulo: f.titulo,
    autorNome: f.autor.trim() || null,
    // Texto que não é número vira NaN e a validação do domínio avisa.
    rendimentoPorcoes: f.porcoes.trim() ? Number(f.porcoes.trim()) : null,
    ingredientes: linhas(f.ingredientes).flatMap((l) => ingredienteDaLinha(l) ?? []),
    passos: linhas(f.passos),
    pontoObs: f.ponto.trim() || null,
    quandoFaz: f.quandoFaz.trim() || null,
    naoClassificado: linhas(f.naoClassificado),
  };
}

/** RF08: conferir e corrigir antes de "Salvar no livro". Nada é gravado antes disso (RN02). */
export function TelaRevisar() {
  const { rascunho, salvar, uriDaMidia } = useDependencias();
  const [base, setBase] = useState<Rascunho | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const saindo = useRef(false);

  useEffect(() => {
    rascunho.recuperar().then((r) => {
      if (!r) return router.back();
      setBase(r);
      setForm(paraFormulario(r));
    });
  }, [rascunho]);

  // Rascunho salvo sozinho enquanto edita: fechar o app no meio não perde nada (RF03, RNF08).
  useEffect(() => {
    if (!base || !form || saindo.current) return;
    const t = setTimeout(() => rascunho.guardar(paraRascunho(base, form)), 600);
    return () => clearTimeout(t);
  }, [base, form, rascunho]);

  async function sair() {
    if (!base || !form) return router.back();
    const escolha = await perguntar('Sair sem salvar no livro?', 'A receita fica guardada como rascunho e você pode continuar depois.', [
      { texto: 'Guardar rascunho' },
      { texto: 'Descartar', estilo: 'destructive' },
      { texto: 'Continuar editando', estilo: 'cancel' },
    ]);
    if (escolha !== 0 && escolha !== 1) return;
    saindo.current = true;
    if (escolha === 0) await rascunho.guardar(paraRascunho(base, form));
    else await rascunho.descartar(paraRascunho(base, form));
    router.back();
  }

  // Voltar do Android também passa pela pergunta.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (sair(), true));
    return () => sub.remove();
  });

  async function salvarNoLivro() {
    if (!base || !form) return;
    setSalvando(true);
    const resultado = await salvar.executar(paraRascunho(base, form));
    setSalvando(false);
    if (!resultado.ok) return setErros(resultado.erros);
    saindo.current = true;
    await rascunho.concluir();
    router.dismissAll();
    router.push(`/receita/${resultado.receita.id}`);
  }

  if (!form) return null;
  const audio = base?.midias.find((m) => m.tipo === 'audio');
  const mudar = (campo: keyof Formulario) => (valor: string) => setForm({ ...form, [campo]: valor });

  return (
    <Tela acao={<Botao icone="check" titulo="Salvar no livro" aoTocar={salvarNoLivro} desativado={salvando} />}>
      {/* O gesto de arrastar para voltar pularia a pergunta de sair. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Cabecalho titulo={base?.receitaId ? 'Editar receita' : 'Revisar receita'} aoVoltar={sair} />

      {audio && (
        <PlayerDeAudio
          uri={uriDaMidia(audio.caminhoLocal)}
          titulo={`Áudio da vó anexado${audio.duracaoS ? ` · ${formatarTempo(audio.duracaoS)}` : ''}`}
        />
      )}

      {audio && !audio.transcricao && !base?.receitaId ? (
        <Aviso>Ouça a gravação e escreva os ingredientes e o passo a passo. O áudio fica guardado junto da receita. A transcrição automática ainda não está disponível.</Aviso>
      ) : (
        base?.origem !== 'texto' && !base?.receitaId && (
          <Aviso>Confira se está igual ao original e corrija o que precisar. Nada vai para o livro antes de você salvar.</Aviso>
        )
      )}

      {erros.length > 0 && (
        <View style={estilos.erros} accessibilityRole="alert">
          {erros.map((e) => <Text key={e} style={estilos.erroTexto}>{e}</Text>)}
        </View>
      )}

      <Campo rotulo="Nome da receita" value={form.titulo} onChangeText={mudar('titulo')} style={estilos.nome} />
      <Campo rotulo="Quem ensinou" value={form.autor} onChangeText={mudar('autor')} placeholder="Vó Maria" />
      <Campo rotulo="Rende quantas porções" value={form.porcoes} onChangeText={mudar('porcoes')} keyboardType="number-pad" />
      <Campo
        rotulo="Ingredientes (um por linha)"
        value={form.ingredientes}
        onChangeText={mudar('ingredientes')}
        multiline
        placeholder={'2 xícaras de fubá\n3 ovos\nsal a gosto'}
      />
      <Campo
        rotulo="Modo de preparo (um passo por linha)"
        value={form.passos}
        onChangeText={mudar('passos')}
        multiline
        placeholder={'Bata os ovos com o açúcar.\nJunte o fubá.'}
      />

      {form.naoClassificado.trim() !== '' && (
        <View style={{ gap: espaco[8] }}>
          <Aviso>Não consegui separar estas linhas. Copie cada uma para Ingredientes ou Modo de preparo. O que ficar aqui não é salvo.</Aviso>
          <Campo rotulo="Linhas para conferir" value={form.naoClassificado} onChangeText={mudar('naoClassificado')} multiline />
        </View>
      )}

      <Campo rotulo="Ponto da massa (opcional)" value={form.ponto} onChangeText={mudar('ponto')} multiline style={{ minHeight: 80 }} />
      <Campo rotulo="Quando faz (opcional)" value={form.quandoFaz} onChangeText={mudar('quandoFaz')} placeholder="No Natal, aos domingos..." />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  nome: { fontFamily: fontes.tituloMedio, fontSize: tamanhos.tituloS },
  erros: { gap: espaco[4], padding: espaco[14], borderRadius: 14, borderWidth: 1.5, borderColor: cores.terracota, backgroundColor: cores.cartao },
  erroTexto: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.pequeno, color: cores.terracota },
});
