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

## 4. Próximas etapas (em ordem)

1. ~~`application/`~~ feito.
2. **Regra de dependência no lint**: `npx expo lint` (instala o ESLint do Expo) + `no-restricted-imports` por pasta. Não precisa de plugin extra.
3. ~~`adapters/persistence/`~~ feito.
4. **`main/`**: composition root e contexto React.
5. **Limpar o template** (abas, explore, `app-tabs.web.tsx`, que tem o único erro de `tsc` hoje) e criar os tokens do moodboard: cores Farinha `#FBF6EA`, Papel `#F1E3C4`, Café `#3B2A20`, Terracota `#A93F28`, Sálvia `#6F8561`, Mostarda `#D9A441`; fontes Fraunces, Caveat e Nunito. Conferir contraste 4,5:1 (RNF05), por exemplo Mostarda sobre Farinha provavelmente não passa.
6. Telas na ordem da seção 10 da arquitetura: livro e cadastro por texto → áudio → foto/OCR/revisão → modo cozinha, escala, lista → exportar PDF → importar PDF → transcrição.
7. **Dev build** a partir da etapa de áudio (módulos nativos não rodam no Expo Go). Spikes S1, S2 e S4 em aparelho real antes de fechar as bibliotecas.
