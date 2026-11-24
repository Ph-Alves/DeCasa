# De Casa

> O caderninho da família, na voz de quem sabe cozinhar. Grava, guarda e passa para frente.

Projeto final da matéria de desenvolvimento de apps. App React Native (Expo) para registrar receitas de família de quem não costuma escrever: por voz, por foto do caderno ou por texto.

## Sumário

- [O problema](#o-problema)
- [Funcionalidades](#funcionalidades)
- [Documentação](#documentação)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar](#como-rodar)
- [Testes](#testes)
- [Status](#status)
- [Fluxo de branches](#fluxo-de-branches)

## O problema

Receita de família quase nunca está escrita direito. Ela vive na cabeça de quem cozinha, em caderno manchado ou em áudio perdido no WhatsApp, cheia de "põe até dar o ponto". O De Casa capta a receita do jeito de quem cozinha, transforma em ingredientes e passos para revisão e permite passá-la para frente.

**Público:** netos e filhos que querem guardar as receitas da família, pessoas mais velhas que cozinham de cabeça e não gostam de digitar.

## Funcionalidades

| Área | O que faz | Requisitos |
|---|---|---|
| Livro | Grade de receitas, busca por título, autor ou ingrediente (sem diferenciar acento) | RF01, RF02 |
| Cadastro | Por texto, por voz (áudio anexado) e por foto do caderno (OCR no aparelho) | RF03 a RF05 |
| Transcrição | Áudio vira texto no próprio aparelho, sem servidor | RF06 |
| Revisão | Parser separa ingredientes e passos; nada é salvo sem revisão | RF07, RF08 |
| Receita | Ver, editar, excluir, ouvir o áudio original | RF09, RF10 |
| Cozinha | Modo cozinha (letra grande, tela acesa, um passo por vez), escala de porções, lista de compras | RF11 a RF13 |
| PDF | Exportar o livro e importar PDF (do app, de terceiros ou escaneado), com tratamento de duplicatas | RF14 a RF16 |

Princípios: **offline-first** (sem servidor, conta ou sincronização), **sem IA paga** (OCR, fala e parser no aparelho ou por regras) e **revisão humana sempre**.

## Documentação

Os documentos do projeto ficam em [`Docs/`](Docs/):

| Documento | Conteúdo |
|---|---|
| [Visão do projeto](Docs/Mds/DeCasa.md) | Problema, público, concorrentes e proposta |
| [Requisitos](Docs/Mds/requisitos.md) | Regras de negócio (RN), requisitos funcionais (RF) e não funcionais (RNF) com critérios de aceite |
| [Arquitetura](Docs/Mds/arquitetura.md) | Camadas, ports, modelo de dados, fluxos, decisões e spikes |
| [Plano](Docs/Mds/plano.md) | Pontos em aberto nos documentos e ordem de implementação |
| [Diagrama de arquitetura](Docs/Images/arquitetura.png) | Camadas da Clean Architecture |
| [Fluxo do usuário](<Docs/Images/DeCasa - fluxo do usuário (com importação de PDF).png>) | Cadastrar, usar receita, exportar e importar PDF |
| [Moodboard](Docs/Images/DeCasa.png) | Paleta (Farinha, Papel, Café, Terracota, Sálvia, Mostarda) e fontes (Fraunces, Caveat, Nunito) |

## Stack

| Necessidade | Escolha |
|---|---|
| App | React Native + Expo SDK 58 (dev build), Expo Router, TypeScript |
| Banco local | `expo-sqlite` |
| Áudio | `expo-audio` |
| Foto e OCR | `expo-camera` + ML Kit (no aparelho) |
| Transcrição | `expo-speech-recognition` ou `whisper.rn` (a definir) |
| PDF | `expo-print`, `expo-sharing`, `expo-document-picker` |
| Tela acesa | `expo-keep-awake` |

As bibliotecas de transcrição, OCR e extração de PDF ainda serão validadas em aparelho real.

## Arquitetura

Clean Architecture. As dependências apontam sempre para dentro:

```
Frameworks e drivers  →  Interface Adapters  →  Use Cases  →  Entities
(Expo, SQLite, ML Kit)   (adapters, telas)      (application)  (domain)
```

- **`domain/`**: entidades e regras puras em TypeScript, sem dependências.
- **`application/`**: casos de uso e *ports* (interfaces) que eles precisam.
- **`adapters/`**: implementações dos ports com bibliotecas nativas (SQLite, áudio, OCR, PDF).
- **`presentation/`**: telas e view models (hooks).
- **`main/`**: composition root, cria os adapters e injeta nos casos de uso.

Trocar uma biblioteca (por exemplo, a de transcrição) é trocar um adapter, sem mexer em regras nem em telas. Só o caso de uso `SalvarReceitaRevisada` grava receita, garantindo que tudo passe pela revisão.

## Estrutura de pastas

```
DeCasa/             app Expo
Docs/
  Mds/              requisitos, arquitetura, visão e plano
  Images/           diagrama, fluxo do usuário e moodboard
```

Dentro do app (`DeCasa/`):

```
src/
  app/              rotas do Expo Router (só montam telas)
  domain/
    texto.ts        normalização (acentos, maiúsculas)
    receita/        Receita, Ingrediente, Quantidade, validação, busca, duplicata
    parser/         texto corrido → ingredientes e passos
    porcoes/        escala de porções
    compras/        lista de compras e consolidação
  application/
    ports/          interfaces: repositórios e plataforma (áudio, fala, OCR, PDF...)
    usecases/       um arquivo por caso de uso
    intercambio/    apêndice de dados do PDF (exportar e importar)
  adapters/
    persistence/    SQLite: migrações e repositórios
    native/         mídia, gravação (expo-audio), permissões, ids, relógio; fala e OCR a fazer
    pdf/            gerador de PDF                   (a fazer)
  presentation/
    ui/tokens.ts    cores, fontes, medidas e sombras do design system
    ui/componentes  Tela, Cabeçalho, Botão, Campo, Aviso
    livro/          livro com grade, busca e rascunho pendente
    receita/        nova receita (voz e texto), revisar, ver, editar e excluir
    captura/        gravador de voz
    cozinha/        modo cozinha
    compras/        lista de compras
  main/             composition root: abre o banco e entrega os casos de uso às telas
```

## Como rodar

Pré-requisitos: Node 24 ou superior e npm.

```bash
cd DeCasa
npm install
npx expo start
```

Com o servidor rodando, abra no Expo Go, no simulador iOS (`i`) ou no emulador Android (`a`). Quando entrarem câmera, áudio, OCR e transcrição, o app vai precisar de **dev build** (`npx expo run:ios` ou `npx expo run:android`), porque esses módulos não rodam no Expo Go.

Todos os comandos rodam dentro de `DeCasa/`.

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor do Expo |
| `npm test` | Roda os testes do domínio |
| `npm run lint` | Lint do Expo |
| `npx tsc --noEmit` | Checagem de tipos |

## Testes

O domínio é testado no computador, sem aparelho, com o executor nativo do Node (`node:test`). O Node 24 executa TypeScript direto, então não há Jest nem configuração extra.

```bash
cd DeCasa
npm test
```

Domínio: leitura de quantidades e frações, escala de porções, consolidação da lista de compras, validação de receita, duplicatas, busca sem acento e o parser com receitas de caderno e texto falado.

Casos de uso: testados com implementações falsas (em memória) dos ports, sem aparelho. Cobrem salvar, editar e excluir, rascunho, busca, captura por voz e foto (inclusive sem permissão ou sem transcrição), lista de compras, ida e volta do apêndice do PDF (inclusive adulterado) e importação com duplicatas.

Persistência: os repositórios SQLite rodam contra o SQLite embutido no Node (`node:sqlite`), com o mesmo SQL do app. Cobrem migrações, ida e volta de receita com todos os campos, edição sem sobras, exclusão em cascata, transação desfeita em caso de erro, rascunho e lista de compras.

Os imports dentro de `src/` usam a extensão `.ts` (`import { normalizar } from '../texto.ts'`), com `allowImportingTsExtensions` ligado no `tsconfig.json`.

## Status

- [x] Camada de domínio com testes
- [x] Casos de uso e ports (`application/`)
- [x] Persistência SQLite
- [x] Composition root, tokens do design system e fontes
- [x] Telas: livro, cadastro por texto, revisão, ver, editar e excluir
- [x] Áudio: gravar, ouvir, regravar, descartar e player na receita
- [ ] Foto e OCR
- [x] Modo cozinha, escala de porções e lista de compras
- [ ] Exportar e importar PDF
- [ ] Transcrição automática

## Fluxo de branches

- `main`: versão estável. Só recebe merge da `develop`.
- `develop`: integração do trabalho em andamento.
- Funcionalidades em branches `feature/<nome>` a partir da `develop`.

## Licença

MIT. Veja [LICENSE](LICENSE).
