import { randomUUID } from 'expo-crypto';

import type { IdGenerator, Relogio } from '../../application/ports/plataforma.ts';

/** UUID v4 gerado no aparelho (D6). */
export const expoIds: IdGenerator = { novo: randomUUID };

export const relogioDoSistema: Relogio = { agora: () => new Date() };
