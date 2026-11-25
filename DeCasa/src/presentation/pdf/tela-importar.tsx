import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { EscolhaDeImportacao, ItemImportado } from '../../application/usecases/importar-pdf.ts';
import { useDependencias } from '../../main/provedor.tsx';
import { abrirRevisao, perguntar } from '../receita/abrir-revisao.ts';
import { Abas, Aviso, Botao, Cabecalho, Marcavel, Tela } from '../ui/componentes.tsx';
import { cores, espaco, fontes, raios, tamanhos } from '../ui/tokens.ts';

/**
 * RF15 e RF16. PDF exportado pelo app: resumo com as receitas e a decisão de cada duplicata.
 * PDF de outro lugar: o texto vai para a revisão, como uma receita nova (RN02).
 */
export function TelaImportar() {
  const { importar, rascunho } = useDependencias();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemImportado[] | null>(null);
  const [escolhas, setEscolhas] = useState<EscolhaDeImportacao[]>([]);

  async function escolherPdf() {
    setErro(null);
    setLendo(true);
    try {
      const uri = await importar.escolherArquivo();
      if (!uri) return;
      const leitura = await importar.ler(uri);
      if (leitura.tipo === 'erro') return setErro(leitura.mensagem);
      if (leitura.tipo === 'do-app') {
        setItens(leitura.itens);
        // Duplicata começa em "Pular": nada do livro muda sem a pessoa escolher (RF16).
        setEscolhas(leitura.itens.map((i) => (i.duplicataDe ? 'pular' : 'manter-ambas')));
        return;
      }
      if (leitura.duplicataDe) {
        await perguntar('Receita parecida no livro', `Já existe "${leitura.rascunho.titulo}" no livro. Esta entra como uma receita nova.`, [{ texto: 'Continuar' }]);
      }
      if (await abrirRevisao(rascunho, leitura.rascunho)) router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLendo(false);
    }
  }

  async function importarEscolhidas() {
    if (!itens) return;
    setLendo(true);
    const { salvas, falhas } = await importar.confirmar(itens.map((item, i) => ({ item, escolha: escolhas[i] })));
    setLendo(false);
    const resumo = `${salvas === 1 ? '1 receita foi para o livro' : `${salvas} receitas foram para o livro`}.`;
    const problemas = falhas.map((f) => `• ${f.titulo || 'sem nome'}: ${f.erros.join(' ')}`).join('\n');
    await perguntar('Importação concluída', problemas ? `${resumo}\n\nNão entraram:\n${problemas}` : resumo, [{ texto: 'Ver o livro' }]);
    router.back();
  }

  const mudar = (i: number) => (e: EscolhaDeImportacao) => setEscolhas(escolhas.map((x, j) => (j === i ? e : x)));
  const quantas = escolhas.filter((e) => e !== 'pular').length;
  const acao = itens
    ? <Botao icone="book-plus" titulo={lendo ? 'Importando...' : `Importar ${quantas === 1 ? '1 receita' : `${quantas} receitas`}`}
        aoTocar={importarEscolhidas} desativado={quantas === 0 || lendo} />
    : <Botao icone="file-pdf-box" titulo={lendo ? 'Lendo o PDF...' : 'Escolher PDF'} aoTocar={escolherPdf} desativado={lendo} />;

  return (
    <Tela acao={acao}>
      <Cabecalho titulo="Importar PDF" />
      {erro && <Aviso>{erro}</Aviso>}

      {!itens ? (
        <Text style={estilos.texto}>
          Escolha um livro exportado pelo De Casa para trazer as receitas de volta, ou um PDF com uma receita de outro lugar. Você
          confere tudo antes de entrar no livro.
        </Text>
      ) : (
        <>
          <Aviso>
            {itens.length === 1 ? 'Este PDF tem 1 receita.' : `Este PDF tem ${itens.length} receitas.`} Áudio e fotos não vêm no PDF.
          </Aviso>
          {itens.map((item, i) => (
            <Item key={i} item={item} escolha={escolhas[i]} aoMudar={mudar(i)} />
          ))}
        </>
      )}
    </Tela>
  );
}

function Item({ item, escolha, aoMudar }: { item: ItemImportado; escolha: EscolhaDeImportacao; aoMudar: (e: EscolhaDeImportacao) => void }) {
  const { titulo, autorNome } = item.rascunho;
  const nome = `${titulo.trim() || 'Sem nome'}${autorNome ? ` · ${autorNome}` : ''}`;
  if (!item.duplicataDe) {
    return <Marcavel texto={nome} marcado={escolha !== 'pular'} aoTocar={() => aoMudar(escolha === 'pular' ? 'manter-ambas' : 'pular')} />;
  }
  return (
    <View style={estilos.duplicata}>
      <Text style={estilos.nome}>{nome}</Text>
      <Text style={estilos.legenda}>Já existe no livro. Substituir troca o texto e mantém o áudio e as fotos de lá.</Text>
      <Abas<EscolhaDeImportacao>
        opcoes={[{ valor: 'pular', titulo: 'Pular' }, { valor: 'substituir', titulo: 'Substituir' }, { valor: 'manter-ambas', titulo: 'As duas' }]}
        valor={escolha}
        aoMudar={aoMudar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  texto: { fontFamily: fontes.corpo, fontSize: tamanhos.corpo, lineHeight: 26, color: cores.cafeSuave },
  duplicata: {
    gap: espaco[8], padding: espaco[14], borderRadius: raios.card, borderWidth: 1.5, borderColor: cores.mostarda, backgroundColor: cores.cartao,
  },
  nome: { fontFamily: fontes.corpoForte, fontSize: tamanhos.corpo, color: cores.cafe },
  legenda: { fontFamily: fontes.corpo, fontSize: tamanhos.pequeno, lineHeight: 21, color: cores.cafeSuave },
});
