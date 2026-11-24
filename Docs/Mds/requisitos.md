# De Casa: documento de requisitos

Versão 1.1, 24/11/2026 (sem nuvem e sem livro compartilhado). App de receitas de família para a matéria de apps (React Native).

> O caderninho da família, na voz de quem sabe cozinhar.

## 1. Introdução

### 1.1 Objetivo

Registrar, de forma simples, receitas de família de quem não costuma escrever (por voz, foto do caderno ou texto), guardá-las num livro e passá-las para frente (exportar e importar PDF). Este documento lista o que o app deve fazer (requisitos funcionais, RF) e como deve se comportar (requisitos não funcionais, RNF), cada um com critérios de aceite.

### 1.2 Escopo

**Não há fase de MVP.** Tudo o que está listado aqui entra na implementação atual. O escopo completo é:

- Cadastro de receita por texto, voz (áudio anexado) e foto do caderno (OCR no aparelho)
- Transcrição automática do áudio, no aparelho
- Revisão do texto antes de salvar
- Ver receita, com player do áudio original
- Modo cozinha (letra grande, tela acesa, um passo por vez)
- Escala de porções
- Lista de compras
- Exportar o livro em PDF
- Importar PDF (do próprio app, de terceiros e escaneado)
- Tudo local no aparelho: sem servidor, sem conta e sem sincronização. Passar receitas para outra pessoa é por PDF (exportar e importar)

A ordem sugerida de construção, por dependência técnica, está em `arquitetura.md`. Ela não é uma priorização: todos os itens fazem parte da entrega.

### 1.3 Atores

| Ator | Descrição |
|---|---|
| Pessoa que registra | Quem cadastra a receita no app (neto, filho, a própria cozinheira) |
| Pessoa que cozinha | Quem sabe a receita; pode ser idosa e pouco habituada a digitar |

### 1.4 Glossário

- **Livro:** a coleção de receitas do aparelho. Há um só livro por aparelho.
- **OCR:** extração de texto de uma foto, feita no aparelho.
- **Transcrição:** conversão de áudio em texto, feita no aparelho.
- **Parser:** regras que transformam texto corrido em ingredientes e passos (sem IA paga).
- **Dev build:** build de desenvolvimento do Expo com módulos nativos (não roda no Expo Go).

## 2. Premissas e restrições

- Sem API de IA paga. OCR, transcrição e parser rodam no aparelho ou por regras.
- React Native com Expo, em dev build. Bibliotecas de câmera, voz e OCR não rodam no Expo Go.
- O app é offline-first: tudo funciona sem internet. Não há servidor, conta, login nem sincronização. Pode ser preciso baixar uma vez modelos de idioma (fala ou OCR), conforme a biblioteca escolhida (a validar nos spikes).
- Passar receitas entre pessoas é por PDF: uma pessoa exporta, envia pela folha de compartilhamento do sistema e a outra importa.
- Interface e reconhecimento de fala e texto em português do Brasil.
- Nada neste documento afirma que uma biblioteca funciona bem para o caso de uso. A escolha de bibliotecas foi feita por leitura de páginas e descrições, sem teste prático. Valores numéricos de desempenho são metas a validar.
- O nome "De Casa" não teve disponibilidade verificada nas lojas nem como marca.

## 3. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Há um único livro por aparelho, criado automaticamente no primeiro uso. Toda receita pertence a ele. |
| RN02 | Uma receita só é salva depois de passar pela tela de revisão, seja qual for a origem (texto, voz, foto, PDF). |
| RN03 | Quantidades aceitam inteiros, decimais, frações ("1/2") e frações unicode ("½"). Quantidades como "a gosto" ou "um pouco" não são escaladas. |
| RN04 | Na lista de compras, itens com o mesmo nome normalizado e a mesma unidade são somados. Unidades diferentes ficam em linhas separadas (sem conversão de unidades). |
| RN05 | Áudio e foto ficam no aparelho. Só saem quando o usuário exporta ou compartilha um arquivo. |

## 4. Requisitos funcionais

### Livro e receitas

**RF01 Listar receitas do livro**
- O livro mostra as receitas em grade, com título, autor ("quem ensinou") e indicador de áudio quando houver.
- Critérios de aceite:
  - Com 0 receitas, aparece um estado vazio com chamada para criar a primeira.
  - Com receitas, a grade mostra todas, ordenadas por data de criação (mais recente primeiro) por padrão.

**RF02 Buscar receita**
- Busca por título, autor e ingrediente.
- Critérios de aceite:
  - Digitar "fubá" retorna receitas com "fubá" no título ou nos ingredientes.
  - A busca ignora maiúsculas e acentos ("acucar" encontra "açúcar").
  - A busca funciona sem internet.

**RF03 Cadastrar receita por texto**
- Campos: título, quem ensinou, rendimento (porções), ingredientes (quantidade, unidade, nome), passos, "ponto da massa" (observação) e "quando faz" (opcionais).
- Critérios de aceite:
  - Título e pelo menos 1 ingrediente e 1 passo são obrigatórios para salvar.
  - O usuário pode digitar ingredientes e passos um por linha em campo de texto, e o app os separa em itens.
  - Ao fechar o app no meio do cadastro, o rascunho é recuperado na próxima abertura.

**RF04 Gravar áudio da receita**
- Gravação de voz, com iniciar, parar, regravar e descartar, anexada à receita.
- Critérios de aceite:
  - Da tela do livro, o usuário começa a gravar em no máximo 3 toques.
  - Durante a gravação aparece indicação visual de que está gravando e o tempo decorrido.
  - O áudio gravado pode ser ouvido antes de salvar.
  - O áudio é salvo localmente e fica vinculado à receita.
  - Se a permissão de microfone for negada, o app explica o motivo e oferece cadastrar por texto.

**RF05 Fotografar caderno e extrair texto (OCR)**
- Foto da página (câmera ou galeria) e extração de texto no aparelho.
- Critérios de aceite:
  - Após a foto, o texto extraído aparece na tela de revisão, junto da foto para comparação.
  - A foto original fica anexada à receita.
  - A extração funciona sem internet.
  - Se nenhum texto for reconhecido, o app avisa e oferece digitar manualmente.
  - Se a permissão de câmera for negada, o app explica e oferece escolher da galeria.

**RF06 Transcrever o áudio automaticamente**
- O áudio gravado (ou escolhido) é transcrito no aparelho para texto em português.
- Critérios de aceite:
  - A transcrição não envia o áudio para servidor de reconhecimento (ver RNF03).
  - O texto transcrito vai para a tela de revisão e é totalmente editável.
  - O áudio original é sempre mantido, mesmo se a transcrição falhar ou for descartada.
  - Se o aparelho não tiver o recurso ou o modelo de idioma instalado, o app informa e segue sem transcrição.
  - Durante a transcrição aparece progresso, e ela pode ser cancelada.

**RF07 Converter texto em ingredientes e passos**
- O parser separa o texto (de OCR, transcrição, PDF ou colado) em ingredientes e passos.
- Critérios de aceite:
  - Linhas começando com quantidade e unidade ("2 xícaras de fubá") viram ingredientes com quantidade, unidade e nome.
  - Frases em verbo no imperativo ou longas viram passos, na ordem em que aparecem.
  - Linhas que o parser não classifica ficam num bloco "não classificado" para o usuário mover manualmente.
  - O parser é determinístico: o mesmo texto gera o mesmo resultado.

**RF08 Revisar antes de salvar**
- Tela única para conferir e corrigir título, ingredientes, passos e observações.
- Critérios de aceite:
  - É possível editar, reordenar, adicionar e remover ingredientes e passos.
  - A fonte original (foto ou texto transcrito) pode ser consultada lado a lado.
  - Nada é gravado no livro até o usuário confirmar "Salvar no livro".
  - Sair sem salvar pede confirmação e oferece guardar como rascunho.

**RF09 Ver receita**
- Mostra título, autor, foto, ingredientes, passos e player do áudio.
- Critérios de aceite:
  - O player tem tocar, pausar e barra de progresso com tempo atual e total.
  - A receita abre sem internet.
  - Existem ações para editar, excluir, escalar porções, adicionar à lista de compras e abrir o modo cozinha.

**RF10 Editar e excluir receita**
- Critérios de aceite:
  - Editar reabre a tela de revisão com os dados atuais.
  - Excluir pede confirmação e remove a receita e seus arquivos locais (áudio e foto).

### Uso na cozinha

**RF11 Modo cozinha**
- Um passo por vez, letra grande, tela sempre acesa, navegação Voltar e Próximo.
- Critérios de aceite:
  - A tela não apaga enquanto o modo cozinha estiver aberto, e volta ao normal ao sair.
  - O texto do passo usa fonte de, no mínimo, 28 pt, e respeita a configuração de tamanho de fonte do sistema.
  - Aparece "Passo N de M" e uma barra de progresso.
  - Se houver ingredientes vinculados ao passo, eles aparecem como chips; se não houver, o passo aparece sem eles.
  - Botões de navegação têm no mínimo 56 pt de altura.
  - No último passo, o botão principal vira "Terminei" e volta para a receita ou o livro.

**RF12 Escalar porções**
- Alterar o número de porções recalcula as quantidades.
- Critérios de aceite:
  - Dobrar as porções dobra todas as quantidades numéricas ("2 xícaras" vira "4 xícaras").
  - Quantidades fracionárias são exibidas como fração legível ("1/2", "1 1/2") quando possível.
  - Itens sem quantidade numérica ("a gosto") não mudam.
  - A escala vale para a visualização, o modo cozinha e a lista de compras, e não altera a receita salva.

**RF13 Lista de compras**
- Gerar uma lista a partir dos ingredientes de uma ou mais receitas.
- Critérios de aceite:
  - O usuário adiciona uma receita inteira (com a escala de porções escolhida) ou itens soltos.
  - Itens iguais são consolidados conforme RN04.
  - É possível marcar itens como comprados, remover itens e limpar a lista.
  - A lista funciona sem internet e persiste ao fechar o app.
  - A lista pode ser compartilhada como texto pela folha de compartilhamento do sistema.

### PDF

**RF14 Exportar o livro em PDF**
- Gera um PDF do livro (ou de receitas selecionadas), para imprimir ou compartilhar.
- Critérios de aceite:
  - O usuário escolhe quais receitas incluir e se as fotos entram.
  - A capa traz o nome do livro (padrão "Livro da Família"), que o usuário pode alterar antes de gerar.
  - O PDF tem capa com o nome do livro, uma receita por página (ou mais, se longa) e texto selecionável.
  - O PDF leva dados estruturados das receitas, para permitir importação confiável (ver RF15).
  - Ao terminar, o usuário pode imprimir ou compartilhar pela folha do sistema.
  - A geração funciona sem internet.

**RF15 Importar PDF**
- Três casos: PDF gerado pelo próprio app, PDF de terceiros e PDF escaneado.
- Critérios de aceite:
  - **PDF do app:** as receitas são recuperadas com os mesmos campos exportados, sem depender de parser. O usuário vê um resumo (quantidade de receitas) e confirma.
  - **PDF de terceiros com texto:** o texto é extraído, passa pelo parser (RF07) e cai na tela de revisão (RF08). O app avisa que é "melhor esforço".
  - **PDF escaneado (só imagem):** o app detecta que não há texto, aplica OCR (RF05) e segue para a revisão.
  - Nenhuma receita importada é gravada sem confirmação do usuário.
  - Arquivos que não são PDF, estão corrompidos ou protegidos por senha geram mensagem de erro clara e nenhuma alteração no livro.

**RF16 Tratar duplicatas na importação**
- Critérios de aceite:
  - Receita com mesmo título e mesmo autor de uma já existente é marcada como possível duplicata.
  - O usuário escolhe, por receita: manter as duas, substituir ou pular.

### Transversais

**RF17 Permissões**
- Critérios de aceite:
  - Microfone, câmera e reconhecimento de fala são pedidos só no momento do uso, com explicação em português.
  - Se negada, a função correspondente oferece uma alternativa (digitar, escolher da galeria) e um atalho para os ajustes do sistema.

## 5. Requisitos não funcionais

| ID | Requisito | Critério de aceite |
|---|---|---|
| RNF01 | **Offline-first.** Todas as funções funcionam sem internet (depois da instalação e de um eventual download único de modelo de idioma). | Com o aparelho em modo avião, é possível cadastrar (texto, voz, foto), transcrever, revisar, ver, cozinhar, escalar, montar lista, exportar e importar PDF. |
| RNF02 | **Sem custo de IA paga.** | Nenhuma chamada a API paga de IA no código. OCR, transcrição e parser rodam no aparelho ou por regras. |
| RNF03 | **Privacidade.** Áudio e foto ficam no aparelho por padrão. | A transcrição roda com reconhecimento no aparelho (nenhum áudio vai a servidor de reconhecimento). O app não envia dados do usuário a nenhum servidor. Áudio e foto só saem do aparelho por ação do usuário (RN05). |
| RNF04 | **Desempenho (metas a validar em aparelho real).** | Abrir o livro com 200 receitas em até 2 s. Busca responde em até 300 ms com 200 receitas. Abrir uma receita em até 500 ms. |
| RNF05 | **Acessibilidade.** | Áreas de toque de no mínimo 44 pt. Contraste de texto de no mínimo 4,5:1. Todos os botões de ícone têm rótulo para leitor de tela (VoiceOver e TalkBack). Textos respeitam o tamanho de fonte do sistema. |
| RNF06 | **Usabilidade para pessoas idosas.** | Gravar áudio em no máximo 3 toques a partir do livro. Textos de interface curtos, sem jargão. Teste com pelo menos 3 pessoas com mais de 60 anos antes da entrega final. |
| RNF07 | **Plataformas.** iOS e Android, via Expo em dev build. | O app instala e roda os fluxos principais em pelo menos 1 aparelho iOS e 1 Android. Versões mínimas de sistema a definir após os testes. |
| RNF08 | **Confiabilidade dos dados.** | Fechar o app à força durante o cadastro não perde a receita (rascunho). Gravações em banco são transacionais. Nenhuma operação deixa receita sem seus ingredientes e passos. |
| RNF09 | **Segurança.** | Banco e mídia ficam na área privada do app. O conteúdo de um PDF importado é tratado como dado não confiável: é validado (formato e checksum) e nunca interpretado como código. O app não guarda chaves nem credenciais. |
| RNF10 | **Armazenamento.** | O app mostra o espaço usado por áudios e fotos. O áudio é gravado em formato comprimido (meta: AAC mono) para ocupar menos espaço no aparelho. |
| RNF11 | **Idioma.** | Interface 100% em português do Brasil. Transcrição configurada para pt-BR. OCR para alfabeto latino. |
| RNF12 | **Qualidade e testes.** | Parser, escala de porções, consolidação da lista de compras e (de)serialização do PDF têm testes unitários automatizados, com casos reais de receitas em português. |
| RNF13 | **Compatibilidade do PDF.** | O PDF exportado abre em leitores comuns, em A4, com texto selecionável (necessário para a importação). |

## 6. Rastreabilidade com o protótipo

O protótipo visual (7 telas) está em https://claude.ai/artifact/1STeU6RPEmB9YxoavodkXi. Ele é só visual: OCR, áudio e PDF não são reais e os dados são de exemplo.

| Requisito | Tela do protótipo |
|---|---|
| RF01, RF02 | Livro de receitas (a busca ainda não está desenhada) |
| RF03, RF04, RF05, RF06 | Nova receita (abas Voz, Foto e Texto) |
| RF07, RF08 | Revisar texto |
| RF09, RF10 | Ver receita (editar e excluir ainda não desenhados) |
| RF11 | Modo cozinha |
| RF14 | Exportar livro |
| RF15, RF16 | Importar PDF (a tela de duplicatas ainda não está desenhada) |
| RF12 | Sem tela no protótipo atual |
| RF13 | Sem tela no protótipo atual |
| RF17 | Sem tela no protótipo atual |

## 7. Fora de escopo

- Pagamento, anúncios ou assinatura
- IA em nuvem ou qualquer API paga
- Importar receitas de sites ou links
- Conversão automática de unidades (ex.: xícara para gramas)
- Nuvem, conta, login, livro compartilhado e sincronização entre aparelhos (retirados em 24/11/2026; compartilhar é por PDF)
- Edição colaborativa
- Versão web ou desktop
- Compartilhamento público ou rede social

## 8. Riscos e questões em aberto

| # | Item | Impacto |
|---|---|---|
| 1 | Precisão da transcrição em português com sotaque, ruído de cozinha e voz idosa: não testada. | RF06 pode exigir mais revisão manual que o esperado. |
| 2 | OCR de letra manuscrita costuma errar mais que texto impresso (não verificado para as bibliotecas escolhidas). | RF05 depende de boa revisão (RF08). |
| 3 | Importar PDF do app depende de embutir dados estruturados no PDF gerado. A técnica de embutir e ler esses dados precisa de teste prático. | RF14 e RF15. Sem isso, a única forma de passar receitas entre aparelhos perde a confiabilidade. |
| 4 | Extração de texto de PDF: a biblioteca candidata é pouco usada e só lê PDF digital. | RF15 em PDFs de terceiros. |
| 5 | Áudio e foto de familiares são dados pessoais; ao exportar PDF com fotos o usuário decide o que sai. Vale revisar consentimento e descarte conforme a LGPD. Este documento não é parecer jurídico. | RF14. |
| 6 | Tamanho do app se o modelo de transcrição for baixado (ver `arquitetura.md`). | RF06 e instalação. |
| 7 | Foto da senhora na cozinha só entra na apresentação com autorização da família. | Material de apresentação. |
| 8 | Disponibilidade do nome "De Casa" nas lojas e como marca não verificada. | Publicação. |
