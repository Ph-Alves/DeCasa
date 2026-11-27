export type ValorSql = string | number | null;

/**
 * O pedaço do `SQLiteDatabase` do expo-sqlite que os repositórios usam.
 * Existe para os repositórios rodarem em teste no computador (com `node:sqlite`) sem o módulo nativo.
 */
export interface Banco {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: ValorSql[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: ValorSql[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: ValorSql[]): Promise<T | null>;
  /** Dentro da tarefa, toda consulta vai pelo `txn` (exigência do expo-sqlite). */
  withExclusiveTransactionAsync(task: (txn: Banco) => Promise<void>): Promise<void>;
}
