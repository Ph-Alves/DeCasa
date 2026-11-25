import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Receita } from '../../domain/receita/receita.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { Aviso, Botao, Cabecalho, Campo, Marcavel, Tela } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, sombras, tamanhos, toque } from '../ui/tokens.ts';

/** RF14: escolher receitas, nome da capa e fotos; gerar e depois compartilhar ou imprimir. */
export function TelaExportar() {
  const { consultar, exportar } = useDependencias();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [nome, setNome] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [incluirFotos, setIncluirFotos] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [pdf, setPdf] = useState<string | null>(null);

  useEffect(() => {
    consultar.livro().then((l) => setNome(l.nome));
    consultar.listar().then((rs) => {
      setReceitas(rs);
      setSelecionadas(new Set(rs.map((r) => r.id)));
    });
  }, [consultar]);

  // Mudou alguma escolha: o PDF gerado antes não vale mais.
  const mudar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPdf(null);
  };

  function alternar(id: string) {
    const novas = new Set(selecionadas);
    if (novas.has(id)) novas.delete(id);
    else novas.add(id);
    mudar(setSelecionadas)(novas);
  }

  async function gerar() {
    setGerando(true);
    try {
      setPdf(await exportar.gerar({ receitaIds: [...selecionadas], incluirFotos, nomeDoLivro: nome }));
    } catch (e) {
      Alert.alert('Não foi possível gerar o PDF', e instanceof Error ? e.message : String(e));
    } finally {
      setGerando(false);
    }
  }

  const total = selecionadas.size;
  const todas = total === receitas.length;
  const acao = pdf
    ? <Botao icone="share-variant" titulo="Compartilhar PDF" aoTocar={() => exportar.compartilhar(pdf)} />
    : <Botao titulo={gerando ? 'Gerando...' : 'Gerar PDF do livro'} aoTocar={gerar} desativado={total === 0 || gerando} />;

  return (
    <Tela acao={acao}>
      <Cabecalho titulo="Exportar livro" />

      <View style={estilos.capa} accessible accessibilityLabel={`Capa: ${nome}, ${total} receitas`}>
        <View style={estilos.lombada} />
        <Text style={estilos.capaRotulo}>o caderninho da</Text>
        <Text style={estilos.capaNome}>{nome.trim() || 'Livro da Família'}</Text>
        <View style={estilos.capaLinha} />
        <Text style={estilos.capaTotal}>{total === 1 ? '1 receita' : `${total} receitas`}</Text>
      </View>

      {pdf && <Aviso>PDF pronto. Envie pela folha de compartilhamento (WhatsApp, e-mail...) ou imprima.</Aviso>}
      {pdf && <Botao tipo="secundario" titulo="Imprimir" aoTocar={() => exportar.imprimir(pdf)} />}

      <Campo rotulo="Nome na capa" value={nome} onChangeText={mudar(setNome)} />
      <Marcavel texto="Incluir as fotos das receitas" marcado={incluirFotos} aoTocar={() => mudar(setIncluirFotos)(!incluirFotos)} />
      <Text style={estilos.nota}>
        O PDF leva os dados de cada receita junto. Assim, dá para importar o livro de volta no app depois. O áudio não vai no PDF.
      </Text>

      <View style={estilos.cabecalhoLista}>
        <Text style={estilos.secao}>Receitas</Text>
        <Pressable onPress={() => mudar(setSelecionadas)(new Set(todas ? [] : receitas.map((r) => r.id)))} style={estilos.link}
          accessibilityRole="button">
          <Text style={estilos.linkTexto}>{todas ? 'Desmarcar todas' : 'Marcar todas'}</Text>
        </Pressable>
      </View>
      <View style={estilos.lista}>
        {receitas.map((r) => (
          <Marcavel key={r.id} texto={r.titulo} marcado={selecionadas.has(r.id)} aoTocar={() => alternar(r.id)} />
        ))}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  capa: {
    alignSelf: 'center', width: 180, height: 240, borderRadius: 10, backgroundColor: cores.terracota,
    alignItems: 'center', justifyContent: 'center', padding: espaco[16], gap: espaco[6], overflow: 'hidden', ...sombras.flutuante,
  },
  lombada: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, backgroundColor: '#8A3220' },
  capaRotulo: { fontFamily: fontes.manuscrito, fontSize: tamanhos.corpo, color: cores.mostardaClara },
  capaNome: { fontFamily: fontes.titulo, fontSize: tamanhos.tituloM, color: cores.cartao, textAlign: 'center' },
  capaLinha: { width: 48, height: 3, borderRadius: 2, backgroundColor: cores.mostarda },
  capaTotal: { fontFamily: fontes.corpoNegrito, fontSize: tamanhos.legenda, color: cores.cartao },
  nota: { fontFamily: fontes.corpo, fontSize: tamanhos.pequeno, lineHeight: 21, color: cores.cafeSuave },
  cabecalhoLista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secao: { fontFamily: fontes.titulo, fontSize: tamanhos.tituloS, color: cores.cafe },
  link: { minHeight: toque.minimo, justifyContent: 'center' },
  linkTexto: { fontFamily: fontes.corpoForte, fontSize: tamanhos.pequeno, color: cores.terracota },
  lista: { backgroundColor: cores.cartao, borderRadius: raios.card, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: espaco[8] },
});
