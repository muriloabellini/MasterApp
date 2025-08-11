import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { setupNotificationHandler } from '@/services/notificationService';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

function MainApp() {
  const { user } = useAuth();

  useEffect(() => {
    // Inicializa o sistema de notificações
    setupNotificationHandler().catch(console.error);
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}