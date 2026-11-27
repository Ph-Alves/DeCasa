import { rascunhoDoTexto } from '../../domain/parser/texto-para-receita.ts';
import { rascunhoVazio, type Midia, type Rascunho } from '../../domain/receita/receita.ts';
import { apagarArquivos } from './apagar-arquivos.ts';
import type { IdGenerator, MidiaStorage, OcrEngine, PermissoesDoSistema, Relogio } from '../ports/plataforma.ts';

type Deps = { ocr: OcrEngine; midias: MidiaStorage; permissoes: PermissoesDoSistema; ids: IdGenerator; relogio: Relogio };

/** RF05, RF07. Devolve rascunho e nunca grava receita (RN02). */
export class CapturarPorFoto {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  /** Só para a câmera (RF17). Sem permissão, a tela oferece a galeria. */
  pedirCamera(): Promise<'concedida' | 'negada'> {
    return this.d.permissoes.solicitar('camera');
  }

  /** A foto fica no rascunho, ao lado do texto, para comparar na revisão (RF05, RF08). */
  async extrair(fotoUri: string): Promise<{ rascunho: Rascunho; problema: 'sem-texto' | 'falhou' | null }> {
    const foto = await this.anexar(fotoUri);
    const { caminhoLocal } = foto;
    const soFoto = (problema: 'sem-texto' | 'falhou') => ({ rascunho: { ...rascunhoVazio('foto'), midias: [foto] }, problema });

    let texto: string;
    try {
      texto = (await this.d.ocr.recognize(this.d.midias.uri(caminhoLocal))).text;
    } catch {
      return soFoto('falhou');
    }
    if (!texto.trim()) return soFoto('sem-texto');
    return { rascunho: rascunhoDoTexto(texto, 'foto', [{ ...foto, transcricao: texto }]), problema: null };
  }

  /** Guarda a foto sem ler o texto: para trocar a foto na revisão (RF10). */
  async anexar(fotoUri: string): Promise<Midia> {
    const { caminhoLocal, tamanhoBytes } = await this.d.midias.guardar(fotoUri, 'foto');
    return {
      id: this.d.ids.novo(), tipo: 'foto', caminhoLocal, duracaoS: null, tamanhoBytes,
      transcricao: null, criadoEm: this.d.relogio.agora(),
    };
  }

  /** O rascunho não foi para a revisão (a pessoa cancelou): a foto guardada não pode ficar órfã. */
  descartar(rascunho: Rascunho): Promise<void> {
    return apagarArquivos(this.d.midias, rascunho.midias);
  }
}
