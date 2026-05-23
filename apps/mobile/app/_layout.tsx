import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Temporariamente comentados para focar no bootstrap do app
// import { QueryProvider } from '@/providers/QueryProvider';
// import '@/i18n'; 

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* <QueryProvider> */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      {/* </QueryProvider> */}
    </GestureHandlerRootView>
  );
}