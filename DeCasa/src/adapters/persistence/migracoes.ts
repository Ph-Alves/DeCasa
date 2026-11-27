import { NOME_PADRAO_DO_LIVRO } from '../../domain/receita/receita.ts';
import type { Banco } from './banco.ts';

/**
 * Cada item é uma versão do banco (PRAGMA user_version). Só acrescentar no fim; nunca editar uma que já saiu.
 * Datas em milissegundos (INTEGER). Ids são UUIDs gerados no aparelho (D6).
 */
const MIGRACOES: string[] = [
  `
  CREATE TABLE livro (
    id TEXT PRIMARY KEY NOT NULL,
    nome TEXT NOT NULL,
    criado_em INTEGER NOT NULL
  );
  -- RN01: um livro só, criado junto com o banco.
  INSERT INTO livro (id, nome, criado_em)
    VALUES ('livro', '${NOME_PADRAO_DO_LIVRO}', CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  CREATE TABLE receita (
    id TEXT PRIMARY KEY NOT NULL,
    titulo TEXT NOT NULL,
    autor_nome TEXT,
    rendimento_porcoes INTEGER,
    ponto_obs TEXT,
    quando_faz TEXT,
    origem TEXT NOT NULL CHECK (origem IN ('texto', 'voz', 'foto', 'pdf')),
    criado_em INTEGER NOT NULL,
    atualizado_em INTEGER NOT NULL
  );

  CREATE TABLE ingrediente (
    id TEXT PRIMARY KEY NOT NULL,
    receita_id TEXT NOT NULL REFERENCES receita(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    quantidade_num REAL,
    quantidade_texto TEXT NOT NULL,
    unidade TEXT,
    nome TEXT NOT NULL,
    observacao TEXT
  );
  CREATE INDEX ingrediente_receita ON ingrediente (receita_id, ordem);

  CREATE TABLE passo (
    id TEXT PRIMARY KEY NOT NULL,
    receita_id TEXT NOT NULL REFERENCES receita(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    texto TEXT NOT NULL
  );
  CREATE INDEX passo_receita ON passo (receita_id, ordem);

  CREATE TABLE midia (
    id TEXT PRIMARY KEY NOT NULL,
    receita_id TEXT NOT NULL REFERENCES receita(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('audio', 'foto')),
    caminho_local TEXT NOT NULL,
    duracao_s REAL,
    tamanho_bytes INTEGER,
    transcricao_texto TEXT,
    criado_em INTEGER NOT NULL
  );
  CREATE INDEX midia_receita ON midia (receita_id, ordem);

  -- Sem chave estrangeira: o item continua na lista se a receita for excluída.
  CREATE TABLE item_compra (
    id TEXT PRIMARY KEY NOT NULL,
    ordem INTEGER NOT NULL,
    nome TEXT NOT NULL,
    quantidade_num REAL,
    unidade TEXT,
    comprado INTEGER NOT NULL DEFAULT 0,
    receita_origem_id TEXT
  );

  -- Um rascunho só (RF03).
  CREATE TABLE rascunho (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload_json TEXT NOT NULL,
    atualizado_em INTEGER NOT NULL
  );
  `,
];

/** Liga as chaves estrangeiras (precisa ser por conexão) e aplica as migrações pendentes, cada uma numa transação. */
export async function migrar(banco: Banco): Promise<void> {
  await banco.execAsync('PRAGMA foreign_keys = ON;');
  const atual = (await banco.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version ?? 0;
  for (let versao = atual; versao < MIGRACOES.length; versao++) {
    await banco.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRACOES[versao]);
      await txn.execAsync(`PRAGMA user_version = ${versao + 1};`);
    });
  }
}
