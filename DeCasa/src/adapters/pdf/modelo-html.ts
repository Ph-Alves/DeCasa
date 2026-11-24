import type { LivroParaExportar } from '../../application/ports/plataforma.ts';
import { textoDoIngrediente } from '../../domain/parser/texto-para-receita.ts';
import type { Receita } from '../../domain/receita/receita.ts';

/** A4 a 72 ppi, como o expo-print espera. */
export const A4 = { largura: 595, altura: 842 } as const;

/**
 * Texto de receita é dado do usuário ou de PDF importado (RNF09): nunca vira HTML.
 * Toda interpolação passa por aqui.
 */
export function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const CSS = `
  @page { size: A4; margin: 48px 56px; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #3B2A20; margin: 0; }
  .capa { height: 700px; display: flex; flex-direction: column; justify-content: center; align-items: center;
          text-align: center; background: #A93F28; color: #FFFDF7; border-radius: 16px; padding: 48px; }
  .capa .rotulo { font-style: italic; font-size: 22px; color: #F8E6B8; }
  .capa h1 { font-size: 52px; margin: 12px 0; }
  .capa .total { font-family: Helvetica, Arial, sans-serif; font-size: 16px; }
  .receita { page-break-before: always; }
  .receita .rotulo { font-style: italic; color: #A93F28; font-size: 18px; }
  .receita h2 { font-size: 34px; margin: 4px 0; }
  .meta { font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #6B5547; margin-bottom: 18px; }
  h3 { font-size: 20px; margin: 22px 0 8px; border-bottom: 1px solid #E3D3AE; padding-bottom: 4px; }
  ul, ol { font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; padding-left: 22px; }
  .obs { font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; }
  .foto { max-width: 100%; max-height: 300px; border-radius: 12px; margin: 8px 0; }
  .dados { page-break-before: always; font-family: Helvetica, Arial, sans-serif; }
  .dados p { font-size: 11px; color: #6B5547; }
  .dados pre { font-family: 'Courier New', monospace; font-size: 8px; line-height: 1.3; white-space: pre-wrap; word-break: break-all; }
`;

function paginaDaReceita(r: Receita, fotoDe: (caminhoLocal: string) => string | null): string {
  const meta = [r.autorNome && `por ${r.autorNome}`, r.rendimentoPorcoes && `rende ${r.rendimentoPorcoes} porções`, r.quandoFaz]
    .filter(Boolean)
    .map((t) => escapar(String(t)))
    .join(' · ');
  const fotos = r.midias
    .filter((m) => m.tipo === 'foto')
    .map((m) => fotoDe(m.caminhoLocal))
    .filter((src): src is string => !!src)
    .map((src) => `<img class="foto" src="${escapar(src)}" />`)
    .join('');

  return `
  <section class="receita">
    <div class="rotulo">receita da família</div>
    <h2>${escapar(r.titulo)}</h2>
    ${meta ? `<div class="meta">${meta}</div>` : ''}
    ${fotos}
    <h3>Ingredientes</h3>
    <ul>${r.ingredientes.map((i) => `<li>${escapar(textoDoIngrediente(i))}</li>`).join('')}</ul>
    <h3>Modo de preparo</h3>
    <ol>${r.passos.map((p) => `<li>${escapar(p.texto)}</li>`).join('')}</ol>
    ${r.pontoObs ? `<h3>Ponto da massa</h3><p class="obs">${escapar(r.pontoObs)}</p>` : ''}
  </section>`;
}

/**
 * RF14 e RNF13: capa com o nome do livro, uma receita por página (ou mais, se longa), texto selecionável
 * e, no fim, o apêndice de dados para a importação (RF15).
 * `fotoDe` devolve a foto já embutida (data URI) ou null para não incluir.
 * shortcut: fontes do sistema (Georgia, Helvetica) no PDF; embutir Fraunces e Nunito precisa de base64 das fontes.
 */
export function htmlDoLivro(livro: LivroParaExportar, fotoDe: (caminhoLocal: string) => string | null = () => null): string {
  const total = livro.receitas.length;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapar(livro.nome)}</title><style>${CSS}</style></head>
<body>
  <section class="capa">
    <div class="rotulo">o caderninho da família</div>
    <h1>${escapar(livro.nome)}</h1>
    <div class="total">${total === 1 ? '1 receita' : `${total} receitas`}</div>
  </section>
  ${livro.receitas.map((r) => paginaDaReceita(r, fotoDe)).join('')}
  <section class="dados">
    <h3>Dados para importação</h3>
    <p>Estas linhas permitem importar o livro de volta no app De Casa, com as receitas no lugar. Não é preciso ler.</p>
    <pre>${livro.apendice.map(escapar).join('\n')}</pre>
  </section>
</body></html>`;
}
