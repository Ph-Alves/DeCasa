import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProvedorDeDependencias } from '../main/provedor.tsx';
import { BarraDoTeclado } from '../presentation/ui/componentes.tsx';
import { cores } from '../presentation/ui/tokens.ts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Só os pesos usados em tokens.fontes; cada peso é um arquivo no app.
  const [fontesProntas, erroNasFontes] = useFonts({
    Caveat_600SemiBold, Fraunces_600SemiBold, Fraunces_700Bold,
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold,
  });
  // Sem as fontes o app ainda funciona (cai na fonte do sistema); não travar por isso.
  if (!fontesProntas && !erroNasFontes) return null;

  return (
    <ProvedorDeDependencias>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.farinha } }} />
      <BarraDoTeclado />
    </ProvedorDeDependencias>
  );
}
