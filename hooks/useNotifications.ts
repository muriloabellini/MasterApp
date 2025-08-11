// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

interface Notification {
  id: number;
  company_id: number;
  titulo: string;
  mensagem: string;
  data_criacao: string;
  lida: boolean;
  // Adicione outros campos conforme necessário
}

// Configuração inicial do handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Hook personalizado para gerenciar notificações
 * 
 * Funcionalidades:
 * - Busca notificações do backend
 * - Exibe notificações locais
 * - Atualização automática quando companyId muda
 * - Tratamento de erros
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  /**
   * Busca notificações do backend
   */
  const fetchNotifications = async () => {
    if (!user?.companyId) {
      setError('Company ID não disponível');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://master.bellinitech.com.br/notificacoes.php?companyId=${user.companyId}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar notificações');
      }

      const data = await response.json();

      if (data.success) {
        const newNotifications = data.data || [];
        setNotifications(newNotifications);
        setLastUpdate(new Date());
        
        // Retorna as notificações para uso imediato se necessário
        return newNotifications;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar notificações:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exibe notificações locais para itens não lidos
   */
  const displayNotifications = async () => {
    try {
      // Verifica permissões
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permissão para notificações não concedida');
        return;
      }

      // Filtra notificações não lidas
      const unreadNotifications = notifications.filter(n => !n.lida);
      
      // Exibe cada notificação
      for (const notification of unreadNotifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.titulo,
            body: notification.mensagem,
            sound: true,
            data: { 
              notificationId: notification.id,
              companyId: notification.company_id 
            },
          },
          trigger: null, // Mostra imediatamente
        });
      }
    } catch (error) {
      console.error('Erro ao exibir notificações:', error);
    }
  };

  /**
   * Atualiza e exibe notificações em uma única chamada
   */
  const refreshAndDisplay = async () => {
    const updatedNotifications = await fetchNotifications();
    if (updatedNotifications.length > 0) {
      await displayNotifications();
    }
  };

  // Busca notificações automaticamente quando o companyId muda
  useEffect(() => {
    if (user?.companyId) {
      fetchNotifications();
    }
  }, [user?.companyId]);

  return {
    notifications,
    loading,
    error,
    lastUpdate,
    refresh: fetchNotifications,
    displayNotifications,
    refreshAndDisplay, // Combina refresh + display
    markAsRead: (id: number) => {
      // Implementação opcional para marcar como lida localmente
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, lida: true } : n
      ));
    },
  };
}