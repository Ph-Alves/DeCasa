import type { AudioRecorder as GravadorDoExpo } from 'expo-audio';

import { compartilhadorDoSistema } from '../adapters/native/compartilhador.ts';
import { ExpoAudioRecorder, OPCOES_DE_GRAVACAO } from '../adapters/native/expo-audio-recorder.ts';
import { ExpoMidiaStorage } from '../adapters/native/expo-midia-storage.ts';
import { ocrDoAparelho } from '../adapters/native/expo-ocr.ts';
import { expoPermissoes } from '../adapters/native/expo-permissoes.ts';
import { transcricaoNoAparelho } from '../adapters/native/transcricao-no-aparelho.ts';
import { expoIds, relogioDoSistema } from '../adapters/native/sistema.ts';
import { leitorDePdf, seletorDoSistema } from '../adapters/pdf/leitor-de-pdf.ts';
import { ExpoPrintGeradorDePdf } from '../adapters/pdf/expo-print-gerador.ts';
import type { Banco } from '../adapters/persistence/banco.ts';
import { SqliteListaComprasRepository } from '../adapters/persistence/sqlite-lista-compras-repository.ts';
import { SqliteLivroRepository } from '../adapters/persistence/sqlite-livro-repository.ts';
import { SqliteRascunhoRepository } from '../adapters/persistence/sqlite-rascunho-repository.ts';
import { SqliteReceitaRepository } from '../adapters/persistence/sqlite-receita-repository.ts';
import { CapturarPorFoto } from '../application/usecases/capturar-por-foto.ts';
import { CapturarPorVoz } from '../application/usecases/capturar-por-voz.ts';
import { ConsultarReceitas } from '../application/usecases/consultar-receitas.ts';
import { ExportarLivroPdf } from '../application/usecases/exportar-livro-pdf.ts';
import { ExcluirReceita } from '../application/usecases/excluir-receita.ts';
import { ListaDeCompras } from '../application/usecases/lista-de-compras.ts';
import { ImportarPdf } from '../application/usecases/importar-pdf.ts';
import { GerenciarRascunho } from '../application/usecases/gerenciar-rascunho.ts';
import { SalvarReceitaRevisada } from '../application/usecases/salvar-receita-revisada.ts';

/**
 * Composition root (D10): o único lugar que conhece todas as camadas.
 * Cria os adapters, injeta nos casos de uso e entrega só os casos de uso para a interface.
 */
export function criarDependencias(banco: Banco) {
  const receitas = new SqliteReceitaRepository(banco);
  const midias = new ExpoMidiaStorage();
  const livro = new SqliteLivroRepository(banco);
  const salvar = new SalvarReceitaRevisada({ receitas, midias, ids: expoIds, relogio: relogioDoSistema });

  return {
    consultar: new ConsultarReceitas({ receitas, livro }),
    salvar,
    rascunho: new GerenciarRascunho({ rascunhos: new SqliteRascunhoRepository(banco), receitas, midias }),
    excluir: new ExcluirReceita({ receitas, midias }),
    exportar: new ExportarLivroPdf({ receitas, livro, gerador: new ExpoPrintGeradorDePdf(midias), compartilhador: compartilhadorDoSistema }),
    compras: new ListaDeCompras({ itens: new SqliteListaComprasRepository(banco), compartilhador: compartilhadorDoSistema, ids: expoIds }),
    importar: new ImportarPdf({ seletor: seletorDoSistema, extrator: leitorDePdf, ocr: ocrDoAparelho, receitas, salvar }),
    capturaPorFoto: new CapturarPorFoto({ ocr: ocrDoAparelho, midias, permissoes: expoPermissoes, ids: expoIds, relogio: relogioDoSistema }),
    /** O gravador vem do hook `useAudioRecorder` da tela (o expo-audio não cria fora de componente). */
    opcoesDeGravacao: OPCOES_DE_GRAVACAO,
    capturaPorVoz: (gravador: GravadorDoExpo) =>
      new CapturarPorVoz({
        gravador: new ExpoAudioRecorder(gravador), fala: transcricaoNoAparelho, midias,
        permissoes: expoPermissoes, ids: expoIds, relogio: relogioDoSistema,
      }),
    /** Para tocar áudio e mostrar foto: caminho relativo → file://. */
    uriDaMidia: (caminhoLocal: string) => midias.uri(caminhoLocal),
  };
}

export type Dependencias = ReturnType<typeof criarDependencias>;
