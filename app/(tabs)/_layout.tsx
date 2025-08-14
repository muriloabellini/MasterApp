import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { setupNotificationHandler, startNotificationMonitoring, stopNotificationMonitoring, BACKGROUND_NOTIFICATION_TASK, checkForNewNotifications } from '@/services/notificationService';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    setupNotificationHandler().catch(console.error);

    // Define a tarefa de background aqui para garantir que esteja sempre registrada
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Erro na tarefa de background:', error);
        return;
      }
      
      try {
        console.log('Executando tarefa de background de notificações (via _layout)');
        const companyId = await AsyncStorage.getItem('monitoringCompanyId');
        if (companyId) {
          console.log('Executando tarefa de background para companyId:', companyId);
          await checkForNewNotifications(Number(companyId));
        } else {
          console.log('CompanyId não encontrado no AsyncStorage (via _layout)');
        }
      } catch (error) {
        console.error('Erro na execução da tarefa de background (via _layout):', error);
      }
    });

    const registerTask = async () => {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
      if (!isRegistered) {
        await TaskManager.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
          minimumInterval: 2, // 2 segundos para testes
        });
        console.log('Tarefa de background registrada com sucesso (via _layout)');
      } else {
        console.log('Tarefa de background já estava registrada (via _layout)');
      }
    };

    registerTask();

    if (user?.empresaId) {
      startNotificationMonitoring(user.empresaId);
    } else {
      stopNotificationMonitoring();
    }

    return () => {
      stopNotificationMonitoring();
    };
  }, [user?.empresaId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

