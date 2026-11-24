# De Casa

> O caderninho da família, na voz de quem sabe cozinhar. Grava, guarda e passa para frente.

Nome anterior do app: Receitas da Vó (por isso o arquivo ainda se chama `receitas-da-vo.md`).

## 1. Problema

Receita de família quase nunca está escrita direito. Ela vive na cabeça de quem cozinha, em caderno manchado, em papel solto ou em áudio perdido no WhatsApp. Quando a pessoa some ou esquece, a receita vai junto. E quem tenta anotar esbarra no "põe até dar o ponto": medidas na intuição, passos fora de ordem e nenhum jeito fácil de registrar.

## 2. Público

- Netos e filhos que querem guardar as receitas dos avós e dos pais.
- Pessoas mais velhas que cozinham de cabeça e não gostam de digitar.
- Famílias que querem um livro de receitas compartilhado.

## 3. Concorrentes e lacunas

Já existem apps de receita, o que confirma que o tema tem público. A lacuna está em captar a receita de quem não escreve (análise baseada em descrições de lojas e páginas, sem teste prático).

| App | O que faz | Lacuna observada |
|---|---|---|
| Gastrobook | Caderno de receitas digital com foco em tradição e receitas de família | Foco em organizar e compartilhar o que já está escrito |
| Meu Livro de Receitas (Android) | Visual de caderninho, exporta e importa para Drive e Dropbox | Entrada de receita é digitação manual |
| Paprika e Mela | Gerenciadores completos, com importação de sites, lista de compras e plano de refeições | Pagos, pensados para quem coleciona receitas da internet |
| Motherly Recipes | Transforma receitas faladas em livro digital, com IA | Usa IA, é recente e não é voltado ao português do Brasil |
| Evernote | Transcreve manuscrito e áudio com IA | App de notas genérico, recurso de transcrição no plano pago |

Fontes:
- https://apps.apple.com/bj/app/gastrobook/id1635164185
- https://www.mobiletime.com.br/?p=642193
- https://apple.co/2yjB8Oh
- https://www.producthunt.com/products/motherly-recipes
- https://evernote.com/pt-br/blog/ai-transcribe-handwriting-to-text

## 4. Proposta e diferencial

O De Casa não é um gerenciador de receitas. É uma ferramenta para **registrar a receita de quem não escreve**, em três camadas:

**Capturar do jeito de quem cozinha**
- Gravar a avó contando o preparo (áudio guardado junto da receita, para preservar a voz e as histórias).
- Fotografar o caderninho ou o papel solto e extrair o texto no próprio aparelho.
- Digitar, para quem preferir.

**Transformar em receita de verdade**
- Transcrição do áudio no aparelho, sem custo.
- Formulário com ingredientes e passos, preenchido a partir do texto para o usuário só revisar.
- Campos para o que o caderno costuma esconder: "ponto da massa", "quem ensinou", "quando faz".

**Passar para frente**
- Livro da família compartilhado, onde todos veem e cada um adiciona.
- Modo cozinha: letra grande, tela sempre acesa, um passo por vez.
- Exportar o livro em PDF para imprimir e presentear.

## 5. Prioridade das funcionalidades

| Funcionalidade | Prioridade |
|---|---|
| Cadastrar receita (ingredientes e passos) | MVP |
| Gravar áudio junto da receita | MVP |
| Foto do caderno com texto extraído no aparelho (OCR) | MVP |
| Modo cozinha | MVP |
| Exportar livro em PDF | MVP |
| Transcrição automática do áudio | Roadmap (validar precisão) |
| Livro compartilhado da família | Roadmap |
| Escalar porções automaticamente | Roadmap |
| Lista de compras a partir da receita | Roadmap |

O MVP não depende de nenhuma API, de transcrição nem de internet.

## 6. Validação da dor (enquete rápida)

Três perguntas para a turma ou conhecidos:
1. Existe alguma receita da sua família que só uma pessoa sabe fazer?
2. Essa receita está escrita em algum lugar?
3. Se fosse fácil gravar a pessoa contando o preparo, você usaria?

Resultado: _(preencher com o número de respostas)_

## 7. Riscos

- **Transcrição em português com sotaque e barulho de cozinha:** a precisão precisa ser testada. Mitigação: o áudio original sempre fica salvo e a transcrição é editável.
- **Transcrição no aparelho exige dev build** (não roda no Expo Go) e, no caso do Whisper, baixar um modelo de algumas dezenas a centenas de MB.
- **OCR de letra manuscrita** costuma errar mais que texto impresso. Mitigação: tela de revisão antes de salvar.
- **Concorrência:** já existem apps de receita. O diferencial é captar de quem não escreve, grátis e em português.
- **Privacidade:** áudio de familiares é dado pessoal. Guardar localmente por padrão e pedir consentimento ao compartilhar.
- **Nome:** a disponibilidade de "De Casa" nas lojas e como marca não foi verificada, e o nome é curto e comum, então pode haver conflito.

## 8. Stack resumo

| Necessidade | Solução gratuita |
|---|---|
| App | React Native com Expo (dev build) |
| Dados locais | SQLite (`expo-sqlite`) |
| Gravação de áudio | `expo-audio` |
| Foto e OCR | `expo-camera` e ML Kit (no aparelho) |
| Transcrição | `expo-speech-recognition` ou `whisper.rn` (no aparelho) |
| Tela sempre acesa | `expo-keep-awake` |
| PDF | `expo-print` |
| Livro compartilhado (roadmap) | Supabase, plano gratuito |

Custo de IA paga: zero.
