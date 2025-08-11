import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  setupNotificationHandler,
  requestNotificationPermissions,
  checkForNewNotifications,
  scheduleSummaryNotifications,
  startNotificationMonitoring,
  stopNotificationMonitoring,
  showSummaryNotification,
  fetchNotificationsFromBackend // Adicionado para depuração
} from '@/services/notificationService';

interface NotificationConfig {
  resumo_8: boolean;
  resumo_12: boolean;
  resumo_18: boolean;
  resumo_23: boolean;
  modelo: 1 | 2 | 3;
}

interface Notification {
  id: number;
  company_id: number;
  titulo: string;
  mensagem: string;
  data_criacao: string;
  lida: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Inicializa o sistema de notificações
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await setupNotificationHandler();
        const permission = await requestNotificationPermissions();
        setHasPermission(permission);
        setIsInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar notificações:', error);
      }
    };

    initializeNotifications();
  }, []);

  // Configura listener para notificações recebidas
  useEffect(() => {
    if (!isInitialized) return;

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida:', notification);
      
      // Se for uma notificação de resumo agendada, executa a lógica
      if (notification.request.content.data?.type === 'summary_trigger') {
        const { hour, companyId, model } = notification.request.content.data;
        // Garante que companyId e model são válidos antes de chamar
        if (companyId && model) {
          showSummaryNotification(hour, Number(companyId), Number(model));
        } else {
          console.warn('Dados insuficientes para showSummaryNotification:', notification.request.content.data);
        }
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Resposta da notificação:', response);
      
      // Aqui você pode implementar navegação baseada no tipo de notificação
      const data = response.notification.request.content.data;
      if (data?.type === 'transaction') {
        // Navegar para tela de transações ou detalhes
        console.log('Navegar para transação:', data.transactionId);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [isInitialized]);

  // Inicia monitoramento quando usuário está logado
  useEffect(() => {
    if (!isInitialized || !hasPermission || !user?.empresaId) return;

    const startMonitoring = async () => {
      if (!isMonitoring) {
        await startNotificationMonitoring(user.empresaId);
        setIsMonitoring(true);
      }
    };

    startMonitoring();

    return () => {
      if (isMonitoring) {
        stopNotificationMonitoring();
        setIsMonitoring(false);
      }
    };
  }, [isInitialized, hasPermission, user?.empresaId, isMonitoring]);

  // Função para configurar notificações de resumo
  const configureSummaryNotifications = async (config: NotificationConfig) => {
    if (!user?.empresaId || !hasPermission) {
      throw new Error('Usuário não logado ou sem permissão para notificações');
    }

    try {
      await scheduleSummaryNotifications(user.empresaId, config);
      return true;
    } catch (error) {
      console.error('Erro ao configurar notificações de resumo:', error);
      throw error;
    }
  };

  // Função para verificar manualmente novas notificações
  const checkNewNotifications = async () => {
    if (!user?.empresaId || !hasPermission) {
      return 0;
    }

    try {
      return await checkForNewNotifications(user.empresaId);
    } catch (error) {
      console.error('Erro ao verificar novas notificações:', error);
      return 0;
    }
  };

  // Função para solicitar permissões novamente
  const requestPermissions = async () => {
    try {
      const permission = await requestNotificationPermissions();
      setHasPermission(permission);
      return permission;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  };

  // Busca notificações do backend (mantendo compatibilidade)
  const fetchNotifications = async () => {
    if (!user?.empresaId) {
      setError('Company ID não disponível');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Usando a função do service para buscar as notificações
      const fetchedNotifications = await fetchNotificationsFromBackend(user.empresaId);

      setNotifications(fetchedNotifications);
      setLastUpdate(new Date());
      
      return fetchedNotifications;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar notificações:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Busca notificações automaticamente quando o empresaId muda
  useEffect(() => {
    if (user?.empresaId) {
      fetchNotifications();
    }
  }, [user?.empresaId]);

  return {
    isInitialized,
    hasPermission,
    isMonitoring,
    notifications,
    loading,
    error,
    lastUpdate,
    configureSummaryNotifications,
    checkNewNotifications,
    requestPermissions,
    refresh: fetchNotifications,
    markAsRead: (id: number) => {
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, lida: true } : n
      ));
    },
  };
}

