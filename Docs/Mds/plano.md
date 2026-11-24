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
  domain/         FEITO (esta sessão)
  application/    ports/, usecases/, intercambio/
  adapters/       persistence/ (SQLite), native/, pdf/
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

## 4. Próximas etapas (em ordem)

1. **`application/`**: ports (como na seção 2.2 da arquitetura) e os casos de uso, testados com fakes. Começar por `SalvarReceitaRevisada` (RN02), `GerenciarRascunho`, `Listar/BuscarReceitas`, `EscalarPorcoes`, `GerarListaDeCompras`. Depois o codec do apêndice do PDF (`intercambio/`) com teste de ida e volta.
2. **Regra de dependência no lint**: `npx expo lint` (instala o ESLint do Expo) + `no-restricted-imports` por pasta. Não precisa de plugin extra.
3. **`adapters/persistence/`**: `expo-sqlite` com migrações, repositórios e mapeadores; transação em `salvar` (RNF08).
4. **`main/`**: composition root e contexto React.
5. **Limpar o template** (abas, explore, `app-tabs.web.tsx`, que tem o único erro de `tsc` hoje) e criar os tokens do moodboard: cores Farinha `#FBF6EA`, Papel `#F1E3C4`, Café `#3B2A20`, Terracota `#A93F28`, Sálvia `#6F8561`, Mostarda `#D9A441`; fontes Fraunces, Caveat e Nunito. Conferir contraste 4,5:1 (RNF05), por exemplo Mostarda sobre Farinha provavelmente não passa.
6. Telas na ordem da seção 10 da arquitetura: livro e cadastro por texto → áudio → foto/OCR/revisão → modo cozinha, escala, lista → exportar PDF → importar PDF → transcrição.
7. **Dev build** a partir da etapa de áudio (módulos nativos não rodam no Expo Go). Spikes S1, S2 e S4 em aparelho real antes de fechar as bibliotecas.
