import { useLocalSearchParams } from 'expo-router';

import { TelaReceita } from '../../presentation/receita/tela-receita.tsx';

export default function RotaReceita() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaReceita id={id} />;
}
