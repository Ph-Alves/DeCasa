import { rascunhoDoTexto } from '../../domain/parser/texto-para-receita.ts';
import { rascunhoVazio, type Midia, type Rascunho } from '../../domain/receita/receita.ts';
import type {
  AudioRecorder, IdGenerator, MidiaStorage, OpcoesDeTranscricao, PermissoesDoSistema, Relogio, SpeechEngine,
} from '../ports/plataforma.ts';

export type ProblemaNaTranscricao = 'sem-permissao' | 'indisponivel' | 'cancelada' | 'falhou';

type Deps = {
  gravador: AudioRecorder;
  fala: SpeechEngine;
  midias: MidiaStorage;
  permissoes: PermissoesDoSistema;
  ids: IdGenerator;
  relogio: Relogio;
};

/** RF04, RF06, RF07. Devolve rascunho e nunca grava receita (RN02). */
export class CapturarPorVoz {
  private readonly d: Deps;

  constructor(deps: Deps) {
    this.d = deps;
  }

  /** O microfone é pedido só agora (RF17). Sem permissão, a tela oferece digitar e abrir os ajustes. */
  async iniciar(): Promise<'gravando' | 'sem-permissao'> {
    if ((await this.d.permissoes.solicitar('microfone')) === 'negada') return 'sem-permissao';
    await this.d.gravador.start();
    return 'gravando';
  }

  async parar(): Promise<Midia> {
    const { uri, durationSec } = await this.d.gravador.stop();
    const { caminhoLocal, tamanhoBytes } = await this.d.midias.guardar(uri, 'audio');
    return {
      id: this.d.ids.novo(), tipo: 'audio', caminhoLocal, duracaoS: durationSec, tamanhoBytes,
      transcricao: null, criadoEm: this.d.relogio.agora(),
    };
  }

  /** Descartar ou regravar (descartar e iniciar de novo). */
  descartar(audio: Midia): Promise<void> {
    return this.d.midias.apagar(audio.caminhoLocal);
  }

  /** O áudio fica no rascunho mesmo se a transcrição falhar (RF06). */
  async transcrever(
    audio: Midia,
    opts: OpcoesDeTranscricao = {},
  ): Promise<{ rascunho: Rascunho; problema: ProblemaNaTranscricao | null }> {
    const soAudio = (problema: ProblemaNaTranscricao) => ({ rascunho: { ...rascunhoVazio('voz'), midias: [audio] }, problema });

    if ((await this.d.permissoes.solicitar('fala')) === 'negada') return soAudio('sem-permissao');
    if (!(await this.d.fala.isAvailable('pt-BR'))) return soAudio('indisponivel');
    try {
      const texto = await this.d.fala.transcribe(this.d.midias.uri(audio.caminhoLocal), opts);
      return { rascunho: rascunhoDoTexto(texto, 'voz', [{ ...audio, transcricao: texto }]), problema: null };
    } catch {
      return soAudio(opts.signal?.aborted ? 'cancelada' : 'falhou');
    }
  }
}
