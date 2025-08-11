import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

// Configuração inicial do Expo Notifications
export async function setupNotificationHandler() {
  // Configura como as notificações serão tratadas
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false, // Você pode ativar se quiser
    }),
  });

  // Configuração específica para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificações',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

// Função para exibir notificações locais baseadas nos dados do seu backend
export function showLocalNotification(title: string, message: string) {
  Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: message,
      sound: true, // Usa o som padrão do sistema
      // data: { customData: 'value' } // Você pode adicionar dados extras se precisar
    },
    trigger: null, // Mostra imediatamente
  });
}