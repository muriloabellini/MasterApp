import React, { useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { setupNotificationHandler } from '../services/notificationHandler';

export function NotificationManager() {
  const { notifications, displayNotifications } = useNotifications();

  useEffect(() => {
    // Configura o handler quando o componente monta
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    // Exibe notificações sempre que a lista é atualizada
    if (notifications.length > 0) {
      displayNotifications();
    }
  }, [notifications]);

  return null; // Este componente não renderiza nada visual
}