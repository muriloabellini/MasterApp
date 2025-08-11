import { Tabs } from 'expo-router';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen
        name="saque"
        options={{ title: 'Saque' }}
      />
      <Tabs.Screen
        name="notificacoes"
        options={{ title: 'Notificações' }}
      />
    </Tabs>
  );
}