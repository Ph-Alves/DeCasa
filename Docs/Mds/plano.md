# De Casa: plano de implementação

24/11/2026. Baseado em `DeCasa.md`, `requisitos.md` (v1.1), `arquitetura.md` (v1.2), fluxo do usuário, moodboard e diagrama de arquitetura.

## 1. Pontos a resolver nos documentos

| # | Onde | Problema | Sugestão |
|---|---|---|---|
| 1 | Fluxo do usuário | Voz e Digitar vão direto para "Ingredientes e passos" sem passar por "Revisar texto". Isso contradiz RN02 (toda origem passa pela revisão). | Todas as entradas (voz, foto, texto, PDF) caem na mesma tela de Revisar, que já mostra ingredientes e passos. |
| 2 | Fluxo do usuário | Faltam busca, editar/excluir, escala de porções, lista de compras e a tela de duplicatas. | Acrescentar ao fluxo ou deixar claro que o fluxo só cobre o caminho principal. |
| 3 | `DeCasa.md` | Ainda fala em MVP/roadmap, Supabase e `receitas-da-vo.md`. Os requisitos dizem: sem MVP, sem nuvem. | Atualizar a seção 5 e a 8 ou marcar o arquivo como histórico. |
| 4 | Moodboard | Título ainda é "Receitas da Vó". | Só visual; trocar quando for usar na apresentação. |
| 5 | RF11 × modelo de dados | Os chips de ingrediente por passo dependem de `passo_ingrediente`, mas nada cria esse vínculo (o parser não, e a revisão não prevê). | Decidir: tirar os chips ou incluir "marcar ingredientes do passo" na revisão. Por ora ficou fora do domínio. |
| 6 | RF02 × SQLite | `LIKE` do SQLite não ignora acento ("acucar" não acha "açúcar"). | Decidido aqui: busca em memória com `correspondeBusca` do domínio (200 receitas cabem). Medir no RNF04. |

## 2. Arquitetura (pastas)

Igual à seção 7 da arquitetura. Dependências só para dentro: `presentation` e `adapters` → `application` → `domain`.

```
src/
  app/            rotas Expo Router (finas)
  domain/         FEITO
  application/    FEITO: ports/, usecases/, intercambio/
  adapters/       persistence/ FEITO; native/, pdf/
  presentation/   telas por funcionalidade + ui/ (tokens do moodboard)
  main/           composition root (injeção manual)
```

## 3. Feito nesta sessão: camada `domain/`

TypeScript puro, sem nenhuma dependência. Testes rodam no computador com `npm test` (`node:test`, sem Jest; o Node 24 executa TypeScript direto). Imports internos usam extensão `.ts` (o Metro aceita; conferido com `expo export`).

| Arquivo | Conteúdo | Requisitos |
|---|---|---|
| `texto.ts` | `normalizar` (sem acento, minúsculas) | RF02, RF16, RN04 |
| `receita/quantidade.ts` | `Quantidade`, `lerQuantidade` (inteiro, decimal com vírgula ou ponto, "1/2", "½", "1 1/2", "duas", "meia"), `formatarQuantidade` ("1 1/2") | RN03, RF12 |
| `receita/receita.ts` | `Receita`, `Ingrediente`, `Passo`, `Midia`, `Rascunho`, `Livro`, `validarRascunho`, `ehPossivelDuplicata`, `correspondeBusca` | RF02, RF03, RF16, RN01 |
| `porcoes/escalar.ts` | `escalar` (não altera a receita, "a gosto" fica igual) | RF12 |
| `compras/item-compra.ts` | `ItemCompra`, `consolidarItens` | RN04 |
| `parser/texto-para-receita.ts` | `textoParaReceita`: título, seções "Ingredientes"/"Modo de preparo", marcadores de lista, unidades, "a gosto", texto falado em frases, verbos de passo, bloco "não classificado" | RF07 |
| `domain.test.ts` | 10 testes | RNF12 |

Limites conhecidos (marcados com `shortcut:` no código):
- Escala não põe a unidade no plural ("2 xícara").
- O parser não separa vários ingredientes numa só frase falada ("duas xícaras de fubá, uma de açúcar e três ovos" vira um passo). Rever depois do spike S1, com transcrições reais.

## 3.1 Feito: camada `application/`

Ports em `ports/repositorios.ts` e `ports/plataforma.ts`. Casos de uso em `usecases/`, testados com fakes (`application.test.ts`, 16 testes).

| Caso de uso | Requisitos | Observação |
|---|---|---|
| `ConsultarReceitas` (listar, buscar, ver) | RF01, RF02, RF09 | Busca em memória; por isso `ReceitaRepository` não tem `buscar` |
| `SalvarReceitaRevisada` | RF03, RF08, RF10, RN02 | Único que grava receita; serve para criar, editar e importar. Na edição, apaga os arquivos de mídia removidos |
| `GerenciarRascunho` (guardar, recuperar, concluir, descartar) | RF03, RF08, RNF08 | `concluir` depois de salvar; `descartar` apaga só as mídias órfãs |
| `ExcluirReceita` | RF10 | Banco primeiro, arquivos depois |
| `CapturarPorVoz` (iniciar, parar, descartar, transcrever) | RF04, RF06, RF07, RF17 | O áudio fica no rascunho mesmo sem transcrição (`problema`: sem-permissao, indisponivel, cancelada, falhou) |
| `CapturarPorFoto` (pedirCamera, extrair) | RF05, RF07, RF17 | Texto do OCR guardado na mídia, para comparar na revisão |
| `ListaDeCompras` | RF12, RF13, RN04 | Lista inteira regravada e consolidada a cada mudança |
| `ExportarLivroPdf` (gerar, compartilhar, imprimir) | RF14 | Nome do livro alterado fica salvo |
| `ImportarPdf` (escolherArquivo, ler, confirmar) | RF15, RF16 | `ler` nunca grava; `confirmar` usa `SalvarReceitaRevisada`. "Substituir" mantém áudio e fotos da receita do livro |
| `intercambio/apendice.ts` | RF14, RF15, RNF09 | Linhas `DC1|n/total|base64|checksum`; conteúdo validado campo a campo, com limites de tamanho |

Diferenças em relação à arquitetura 2.2:
- `EscalarPorcoes` e o modo cozinha não têm caso de uso: a tela usa `escalar` do domínio direto (D9).
- Ports novos: `LivroRepository` (nome do livro no PDF), `PdfTextExtractor.rasterize` (PDF escaneado, spike S4), `GeradorDePdf.imprimir`, `MidiaStorage.espacoUsado` (RNF10) e a classe `ArquivoInvalidoError`.
- `Rascunho.receitaId` diferencia cadastro novo de edição.

Ainda não coberto: transcrever áudio escolhido de arquivo (RF06 cita "ou escolhido").

## 3.2 Feito: `adapters/persistence/`

- `banco.ts`: interface mínima `Banco` (o pedaço do `SQLiteDatabase` do expo-sqlite que os repositórios usam). Nos testes ela é implementada com `node:sqlite`, então o SQL roda de verdade no computador.
- `migracoes.ts`: versões por `PRAGMA user_version`, cada uma numa transação; liga `foreign_keys`. A versão 1 cria as tabelas da seção 4 da arquitetura e o livro único (RN01). Ficou de fora `passo_ingrediente` (ver ponto 5 da seção 1). `midia` ganhou `ordem`.
- `conexao.ts`: `abrirBanco()` abre `decasa.db`, liga WAL e migra. É o único arquivo que importa `expo-sqlite`.
- Repositórios: `SqliteReceitaRepository` (salvar com UPSERT e filhos regravados numa transação; listar com 4 consultas no total), `SqliteRascunhoRepository` (JSON; ilegível vira null), `SqliteListaComprasRepository`, `SqliteLivroRepository`.
- `persistence.test.ts`: 8 testes, incluindo cascata, rollback (RNF08) e o `SalvarReceitaRevisada` rodando sobre o SQLite.

Não testado em aparelho: o `abrirBanco()` real (expo-sqlite precisa do app rodando).

## 3.3 Feito: composition root, tokens e limpeza do template

- `main/dependencias.ts` cria adapters e casos de uso (injeção manual, D10); `main/provedor.tsx` abre o banco, segura a splash até ficar pronto e entrega os casos de uso por contexto (`useDependencias`). Se o banco não abrir, mostra mensagem em vez de tela branca.
- Ligados por enquanto: consultar, salvar, rascunho, excluir. Captura, lista de compras e PDF entram com os adapters de cada um.
- `adapters/native/`: `ExpoMidiaStorage` (expo-file-system, pasta `documentos/midias/`) e ids UUID (`expo-crypto`). **`caminhoLocal` é relativo** (`midias/<uuid>.m4a`): no iOS o caminho absoluto muda a cada atualização do app. Por isso o port `MidiaStorage` ganhou `uri()`, usado por voz e foto antes da transcrição e do OCR.
- `presentation/ui/tokens.ts`: tokens da página 7 do design system, já com a borda de controle corrigida (`#9A8456`).
- Fontes por peso (`@expo-google-fonts/<familia>/<peso>`): só os 7 arquivos usados entram no app.
- Template do Expo removido (abas, explore, componentes, hooks, imagens, `reset-project`). `tsc` sem erros. `app.json`: nome "De Casa", tema claro, splash Farinha.
- `ConsultarReceitas.livro()` para o nome no cabeçalho.
- Conferido no simulador iOS (Expo Go): tela do livro com as fontes e o nome vindo do SQLite.

## 3.4 Feito: telas do livro e do cadastro por texto (RF01 a RF03, RF08 a RF10)

- **Livro** (`/`): grade de 2 colunas com inicial em Caveat e tag de áudio, busca sem acento em memória, aviso de rascunho pendente (Continuar ou Descartar), estado vazio e "Nova receita" fixo embaixo.
- **Nova receita** (`/nova`): só a aba Texto por enquanto; o parser separa e abre a revisão.
- **Revisar** (`/revisar`): ingredientes e passos um por linha (RF03), linhas não classificadas à parte (RF07), erros de validação do domínio no topo. Rascunho guardado sozinho 600 ms depois de cada mudança; sair pergunta (guardar, descartar, continuar), inclusive pelo voltar do Android, e o gesto de arrastar fica desligado.
- **Receita** (`/receita/[id]`): capa, caderno pautado em Caveat, passos numerados, ponto e "quando faz", editar (reabre a revisão) e excluir com confirmação.
- Um rascunho só por vez: ao começar outro, o app pergunta se continua o anterior ou descarta.
- Domínio: `ingredienteDaLinha` e `textoDoIngrediente` (ida e volta testada).
- Conferido no simulador iOS por deep link, com receitas gravadas pelo próprio `SalvarReceitaRevisada`: livro, receita e revisão abrem com os dados. **Não conferido:** digitar, salvar pelo botão e os alertas (não dá para tocar no simulador daqui).

Limites: o tile não tem xadrez (precisa de SVG); player de áudio, escala, lista e modo cozinha entram nas próximas etapas.

## 3.5 Feito: áudio (RF04, RF09, RF17, RNF10)

- **Nova receita** com abas Voz (padrão) e Texto: do livro até gravar são 2 toques (RF04, RNF06). Círculo de 120 Terracota/Café, tempo decorrido, ouvir antes de continuar, gravar de novo e descartar.
- **Permissão** de microfone só ao tocar em gravar, com texto em português no `app.json`; negada, a tela oferece abrir os ajustes ou escrever a receita (RF17).
- **Revisão** mostra o player para ouvir enquanto escreve; **receita** mostra "Ouvir o áudio da vó" (tocar, pausar, progresso, tempo atual e total).
- `ExpoAudioRecorder`: AAC mono 64 kbps (RNF10). O expo-audio só cria o gravador pelo hook `useAudioRecorder`, então a tela cria o gravador e o composition root monta o `CapturarPorVoz` com ele (`deps.capturaPorVoz(gravador)`).
- `semTranscricao`: o `SpeechEngine` responde "indisponível" até a etapa de transcrição; a revisão abre vazia, com o áudio e um aviso. O `CapturarPorVoz` agora checa a disponibilidade antes de pedir permissão de fala.
- Nada fica órfão: sair da nova receita com gravação descarta o arquivo; se a pessoa escolher continuar o rascunho anterior, a gravação nova continua na tela.
- Ícones com `@expo/vector-icons` (Material Community) no lugar de caracteres e emoji.
- Conferido no simulador: abas, botão de gravar e player tocando um arquivo real em `midias/` (o caminho relativo resolve certo). **Não conferido:** gravar de verdade e o alerta de permissão (não dá para tocar no simulador daqui).

Limites: sem a animação de ondas durante a gravação (e a versão estática para movimento reduzido).

## 3.6 Feito: modo cozinha, escala e lista de compras (RF11 a RF13)

- **Receita:** seletor de porções (− N +) que recalcula os ingredientes só na tela (RF12). Sem rendimento informado, vira "N× a receita" (base 1); a lista usa a mesma regra. "Cozinhar agora" é a ação principal; "Adicionar à lista de compras" leva os ingredientes na escala escolhida.
- **Modo cozinha** (`/cozinha/[id]?porcoes=N`): tela acesa com `useKeepAwake` (desliga ao sair), Sair, barra em segmentos e "Passo N de M", passo em Fraunces 40 (cresce com a fonte do sistema), Voltar e Próximo de 68 pt, "Terminei" no último. Os ingredientes na escala abrem num botão, porque ainda não há chips por passo.
- **Lista de compras** (`/compras`, botão no livro): marcar (checkbox de 48 pt), remover, adicionar item escrito ("1 kg de açúcar" vira quantidade, unidade e nome), limpar com confirmação e compartilhar como texto pela folha do sistema.
- **Domínio:** `unidadeConcordante` ("2 xícaras", "3 colheres de sopa") usada pela escala e pela lista; `chaveDaUnidade` faz "xícara" e "xícaras" somarem (RN04). Resolve o limite anotado na etapa do domínio.
- `compartilhadorDoSistema` (texto pelo `Share` do React Native; arquivo entra com o PDF).
- Conferido no simulador com a lista montada pelo próprio `ListaDeCompras`: 1 xícara avulsa + 4 do bolo em dobro = "5 xícaras de fubá". **Não conferido:** tocar nos botões e a folha de compartilhamento.

## 3.7 Feito: exportar PDF (RF14, RNF13)

- **Tela "Exportar livro"** (`/exportar`, botão no livro): capa como no protótipo, nome editável (fica salvo no livro), incluir fotos, escolher receitas (todas por padrão). Gerar → Compartilhar (folha do sistema) ou Imprimir.
- `adapters/pdf/modelo-html.ts`: função pura com capa, uma receita por página, ingredientes, passos, ponto da massa e o apêndice "Dados para importação". **Todo texto é escapado** (receita importada é dado não confiável, RNF09). 3 testes.
- `ExpoPrintGeradorDePdf`: A4; fotos embutidas em base64 só se escolhidas; arquivo renomeado para o nome do livro.
- `compartilhadorDoSistema.compartilharArquivo` com `expo-sharing`.

**Spike S3 (parcial, 24/11/2026):** HTML do app (12 receitas com acentos, aspas, `&` e `<tags>`) → PDF A4 pelo WebKit do macOS (mesmo motor do expo-print no iOS) → `pdftotext` → `decodificarApendice`: **12 de 12 receitas recuperadas** com todos os campos, nos modos com e sem layout. Falta: PDF gerado no Android (outro motor), o extrator que o app vai usar no aparelho (etapa de importar) e PDF impresso e escaneado (esse cai no parser por desenho).

Limites: o PDF usa Georgia e Helvetica (embutir as fontes do app fica para depois); o áudio não vai no PDF (como no desenho original).

## 3.8 Feito: dev build (iOS)

- `expo-dev-client` instalado; `app.json` com `bundleIdentifier` e `package` = `com.phalves.decasa`.
- `npx expo run:ios` gerou `ios/` (fora do Git, CNG), instalou os pods e compilou sem erros (2 avisos de script do Xcode). O app "De Casa" abre no simulador e carrega o livro com dados próprios (outro contêiner, separado do Expo Go).
- Para conectar a um servidor já aberto em modo Expo Go: `xcrun simctl openurl booted "exp+decasa://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"`. Com `npx expo start` iniciado depois do dev client, o lançador acha o servidor sozinho.
- Android ainda não: falta `ANDROID_HOME` e um JDK 17 nesta máquina.

## 3.9 Feito: foto e OCR (RF05, RF07, RF17)

- Aba **Foto** na "Nova receita": "Tirar foto da receita" (pede a câmera só nessa hora) e "Escolher foto do aparelho" (galeria, sem permissão no iOS 14+).
- `expo-image-picker` já entrega a foto endireitada (EXIF), e o `expo-text-extractor` (Vision / ML Kit) lê o texto no aparelho. O texto passa pelo mesmo parser e vai para a revisão (RN02), com a foto no topo para conferir.
- Se não houver texto ou o OCR falhar, a foto vai mesmo assim para a revisão, com um aviso. Se a pessoa cancelar antes da revisão, `CapturarPorFoto.descartar` apaga a foto.
- Spike S2 (parcial, no Mac): o Vision com a configuração da lib (sem idioma definido) leu uma receita impressa com todos os acentos. Ainda falta testar letra de mão em aparelho real.
- O `app.json` ganhou o plugin `expo-image-picker` com os textos de câmera e fotos. Lição: o `run:ios` não reaplica plugins numa pasta `ios/` que já existe. Use `prebuild --clean`.

## 4. Próximas etapas (em ordem)

1. ~~`application/`~~ feito.
2. **Regra de dependência no lint**: `npx expo lint` (instala o ESLint do Expo) + `no-restricted-imports` por pasta. Não precisa de plugin extra.
3. ~~`adapters/persistence/`~~ feito.
4. **`main/`**: composition root e contexto React.
5. ~~Limpar o template e criar os tokens~~ feito. Era: tokens do moodboard: cores Farinha `#FBF6EA`, Papel `#F1E3C4`, Café `#3B2A20`, Terracota `#A93F28`, Sálvia `#6F8561`, Mostarda `#D9A441`; fontes Fraunces, Caveat e Nunito. Conferir contraste 4,5:1 (RNF05), por exemplo Mostarda sobre Farinha provavelmente não passa.
6. Telas na ordem da seção 10 da arquitetura (até exportar PDF, feito): livro e cadastro por texto → áudio → foto/OCR/revisão → modo cozinha, escala, lista → exportar PDF → importar PDF → transcrição.
7. **Dev build** a partir da etapa de áudio (módulos nativos não rodam no Expo Go). Spikes S1, S2 e S4 em aparelho real antes de fechar as bibliotecas.
