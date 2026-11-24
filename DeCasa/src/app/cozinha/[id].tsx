import { useLocalSearchParams } from 'expo-router';

import { TelaCozinha } from '../../presentation/cozinha/tela-cozinha.tsx';

export default function RotaCozinha() {
  const { id, porcoes } = useLocalSearchParams<{ id: string; porcoes?: string }>();
  // Valor inválido na URL cai em 1 (escalar recusa zero ou negativo).
  const n = Math.max(1, Math.floor(Number(porcoes)) || 1);
  return <TelaCozinha id={id} porcoes={n} />;
}
