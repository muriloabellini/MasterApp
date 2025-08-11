import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as Notifications from 'expo-notifications';

// 1. Configuração básica
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

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
    // 2. Quando receber notificação
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida:', notification);
    });

    // 3. Quando clicar na notificação
    const clickSub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/(tabs)');
    });

    // 4. Busca suas notificações do backend
    const fetchNotifs = async () => {
      if (!user?.empresaId) return;
      
      const res = await fetch(`https://master.bellinitech.com.br/notificacoes.php?companyId=${user.empresaId}`);
      const { data } = await res.json();
      
      data?.forEach((notif: any) => {
        Notifications.presentNotificationAsync({
          title: notif.titulo,
          body: notif.mensagem
        });
      });
    };

    fetchNotifs();

    return () => {
      subscription.remove();
      clickSub.remove();
    };
  }, [user?.empresaId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}