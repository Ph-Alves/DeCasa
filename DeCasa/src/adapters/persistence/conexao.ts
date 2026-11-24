import { openDatabaseAsync } from 'expo-sqlite';
import type { Banco } from './banco.ts';
import { migrar } from './migracoes.ts';

/** Abre o banco na área privada do app (RNF09) e deixa o esquema na última versão. */
export async function abrirBanco(): Promise<Banco> {
  const banco = await openDatabaseAsync('decasa.db');
  await banco.execAsync('PRAGMA journal_mode = WAL;');
  await migrar(banco);
  return banco;
}
