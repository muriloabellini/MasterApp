import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Configuração inicial do Expo Notifications
export async function setupNotificationHandler() {
  // Configura como as notificações serão tratadas
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Configuração específica para Android
  if (Platform.OS === 'android') {
    const channelId = 'default';
    const existingChannels = await Notifications.getNotificationChannelsAsync();
    const channelExists = existingChannels.some(channel => channel.id === channelId);

    if (!channelExists) {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: 'Notificações Master Pagamentos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  // Solicita permissões
  await requestNotificationPermissions();
}

// Solicita permissões para notificações
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão para notificações negada');
    return false;
  }

  return true;
}

// Interface para dados de transação
interface TransactionData {
  id: number;
  tipo: string;
  valor: number;
  company_id: number;
  status_pagamento: string;
  metodo_pagamento: string;
  lida: number;
  criada_em: string;
}

// Interface para resposta da API
interface NotificationResponse {
  success: boolean;
  data: TransactionData[];
  count: number;
}

// Formata valor em centavos para reais
function formatCurrency(valueInCents: number): string {
  const valueInReais = valueInCents / 100;
  return valueInReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Gera mensagem baseada no status e método de pagamento
function generateTransactionMessage(transaction: TransactionData): { title: string; body: string } {
  const valor = formatCurrency(transaction.valor);
  
  if (transaction.status_pagamento === 'waiting_payment') {
    return {
      title: 'Venda Gerada',
      body: `Nova venda de ${valor} aguardando pagamento via ${transaction.metodo_pagamento === 'pix' ? 'PIX' : 'Cartão de Crédito'}`
    };
  } else if (transaction.status_pagamento === 'paid') {
    const metodo = transaction.metodo_pagamento === 'pix' ? 'PIX' : 'Cartão de Crédito';
    return {
      title: 'Pagamento Confirmado',
      body: `Pagamento de ${valor} confirmado via ${metodo}`
    };
  } else {
    return {
      title: 'Atualização de Venda',
      body: `Venda de ${valor} - Status: ${transaction.status_pagamento}`
    };
  }
}

// Exibe notificação local para transação
export async function showTransactionNotification(transaction: TransactionData) {
  const { title, body } = generateTransactionMessage(transaction);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: {
        type: 'transaction',
        transactionId: transaction.id,
        companyId: transaction.company_id
      }
    },
    trigger: null, // Mostra imediatamente
  });
}

// Busca notificações do backend
export async function fetchNotificationsFromBackend(companyId: number): Promise<TransactionData[]> {
  try {
    console.log(`Buscando notificações para companyId: ${companyId}`);
    const response = await axios.get<NotificationResponse>(
      `https://master.bellinitech.com.br/notificacoes.php?companyId=${companyId}`,
      {
        timeout: 1000, // 10 segundos de timeout
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Resposta da API:', response.data);
    
    if (response.data.success) {
      return response.data.data || [];
    }
    
    console.log('API retornou success: false');
    return [];
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

// Verifica e processa novas notificações
export async function checkForNewNotifications(companyId: number) {
  try {
    console.log(`Verificando novas notificações para companyId: ${companyId}`);
    const notifications = await fetchNotificationsFromBackend(companyId);
    const lastCheckedKey = `lastChecked_${companyId}`;
    const lastChecked = await AsyncStorage.getItem(lastCheckedKey);
    const lastCheckedTime = lastChecked ? new Date(lastChecked) : new Date(0);
    
    console.log(`Última verificação: ${lastCheckedTime.toISOString()}`);
    console.log(`Total de notificações recebidas: ${notifications.length}`);
    
    // Filtra notificações não lidas e criadas após a última verificação
    const newNotifications = notifications.filter(notification => {
      const createdAt = new Date(notification.criada_em);
      return notification.lida === 0 && createdAt > lastCheckedTime;
    });
    
    console.log(`Novas notificações encontradas: ${newNotifications.length}`);
    
    // Exibe notificações para cada nova transação
    for (const notification of newNotifications) {
      console.log(`Exibindo notificação para transação ID: ${notification.id}`);
      await showTransactionNotification(notification);
    }
    
    // Atualiza timestamp da última verificação
    await AsyncStorage.setItem(lastCheckedKey, new Date().toISOString());
    
    return newNotifications.length;
  } catch (error) {
    console.error('Erro ao verificar novas notificações:', error);
    return 0;
  }
}

// Modelos de mensagens para resumos
const RESUMO_MODELS = {
  1: { // Criativo
    8: [
      'Comece seu dia no verde: sua operação já movimentou {valor} até agora.',
      'Acordou com saldo positivo? Hoje sua operação iniciou faturando {valor}.',
      'A manhã trouxe bons números: {valor} de movimentação até agora.',
      '{valor} faturados só pela manhã. Sua operação está no ritmo certo!',
      'Já conferiu os números? {valor} em transações até as 8h.'
    ],
    12: [
      'Meio-dia no verde: sua operação já movimentou {valor} hoje.',
      'Almoço com saldo positivo? Sua operação já faturou {valor}.',
      'O dia está rendendo: {valor} de movimentação até agora.',
      '{valor} faturados só pela manhã. Continue assim!',
      'Já olhou os números? {valor} em transações até o meio-dia.'
    ],
    18: [
      'Final do dia no verde: {valor} movimentados hoje!',
      'Encerrando com saldo positivo? Hoje faturou {valor}.',
      'O dia foi produtivo: {valor} em transações.',
      '{valor} faturados só nesta tarde. Resultado e tanto!',
      'Já fechou os números? {valor} até as 18h.'
    ],
    23: [
      'Noite no verde: {valor} movimentados hoje!',
      'Dormindo com saldo positivo? Hoje faturou {valor}.',
      'O dia fechou com bons números: {valor} em transações.',
      '{valor} faturados até agora. Amanhã tem mais!',
      'Já conferiu o fechamento? {valor} até as 23h.'
    ]
  },
  2: { // Descolado
    8: [
      'E aí, já viu a grana rodar hoje? Sua operação bateu {valor} até agora.',
      'Já tá no pique? Porque sua operação tá: {valor} movimentados antes das 8h.',
      'Seu gateway tá tinindo: {valor} rodaram pela sua operação logo cedo.',
      'Primeira olhada no painel e: BOOM, {valor} na conta.',
      'Começou cedo o fluxo! Já são {valor} rodando.'
    ],
    12: [
      'E aí, já viu a grana dessa manhã? {valor} rodando!',
      'Tá no pique? Sua operação já mandou {valor} até o meio-dia.',
      'Seu gateway tá bombando: {valor} rodaram hoje.',
      'Olhada no painel e... {valor} na conta!',
      'Fluxo intenso! Já são {valor} no caixa.'
    ],
    18: [
      'E aí, viu o balanço do dia? {valor} rodando!',
      'Tá finalizando com estilo? Sua operação mandou {valor}.',
      'Gateway encerrou o dia com {valor} na conta.',
      'Olhou o painel? {valor} de grana hoje!',
      'Fluxo do dia: {valor} no caixa.'
    ],
    23: [
      'E aí, fechou o dia com grana? {valor} rodando!',
      'Tá deitando com vitória? Sua operação mandou {valor}.',
      'Gateway fechou com {valor} na conta.',
      'Última olhada no painel: {valor} hoje!',
      'Fluxo total: {valor} no caixa.'
    ]
  },
  3: { // Formal
    8: [
      'Atualização das 08h: sua operação já registrou {valor} em transações.',
      'Relatório parcial matinal: {valor} movimentados até o momento.',
      'Dados das 08h indicam uma movimentação de {valor}.',
      'O início do dia apresentou um volume de {valor} em sua operação.',
      'Primeira parcial do dia: {valor} em faturamento registrado.'
    ],
    12: [
      'Atualização das 12h: {valor} em transações registradas.',
      'Relatório parcial: {valor} movimentados até o meio-dia.',
      'Dados das 12h indicam volume de {valor}.',
      'O período matinal apresentou {valor} em movimentação.',
      'Parcial do meio-dia: {valor} em faturamento.'
    ],
    18: [
      'Atualização das 18h: {valor} em transações hoje.',
      'Relatório parcial: {valor} movimentados até agora.',
      'Dados das 18h indicam volume de {valor}.',
      'O período vespertino registrou {valor}.',
      'Parcial do fim do dia: {valor} em faturamento.'
    ],
    23: [
      'Atualização das 23h: {valor} em transações hoje.',
      'Relatório final: {valor} movimentados até agora.',
      'Dados das 23h indicam volume de {valor}.',
      'O período noturno registrou {valor}.',
      'Parcial final: {valor} em faturamento.'
    ]
  }
};

// Busca dados de resumo do backend
async function fetchSummaryData(companyId: number): Promise<number> {
  try {
    console.log(`Buscando dados de resumo para companyId: ${companyId}`);
    const response = await axios.get(
      `https://master.bellinitech.com.br/buscar_resumo.php?company_id=${companyId}`,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Resposta da API de resumo:', response.data);
    
    if (response.data.success) {
      return response.data.total || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Erro ao buscar dados de resumo:', error);
    return 0;
  }
}

// Exibe notificação de resumo
export async function showSummaryNotification(hour: 8 | 12 | 18 | 23, companyId: number, model: 1 | 2 | 3 = 1) {
  try {
    console.log(`Exibindo notificação de resumo para ${hour}h, companyId: ${companyId}, modelo: ${model}`);
    const totalValue = await fetchSummaryData(companyId);
    const formattedValue = formatCurrency(totalValue);
    
    const messages = RESUMO_MODELS[model][hour];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const finalMessage = randomMessage.replace('{valor}', formattedValue);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Resumo ${hour}h - Master Pagamentos`,
        body: finalMessage,
        sound: true,
        data: {
          type: 'summary',
          hour,
          companyId,
          model
        }
      },
      trigger: null,
    });
    
    console.log(`Notificação de resumo ${hour}h exibida com sucesso`);
  } catch (error) {
    console.error('Erro ao exibir notificação de resumo:', error);
  }
}

// Agenda notificações de resumo baseadas na configuração
export async function scheduleSummaryNotifications(companyId: number, config: {
  resumo_8: boolean;
  resumo_12: boolean;
  resumo_18: boolean;
  resumo_23: boolean;
  modelo: 1 | 2 | 3;
}) {
  try {
    console.log('Agendando notificações de resumo:', config);
    
    // Cancela notificações agendadas anteriormente
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const scheduleHour = async (hour: 8 | 12 | 18 | 23, enabled: boolean) => {
      if (!enabled) return;
      
      console.log(`Agendando notificação para ${hour}h`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Resumo ${hour}h - Master Pagamentos`,
          body: 'Verificando movimentações...',
          sound: true,
          data: {
            type: 'summary_trigger',
            hour,
            companyId,
            model: config.modelo
          }
        },
        trigger: {
          hour,
          minute: 0,
          repeats: true,
        },
      });
      
      console.log(`Notificação agendada para ${hour}h com sucesso`);
    };
    
    await scheduleHour(8, config.resumo_8);
    await scheduleHour(12, config.resumo_12);
    await scheduleHour(18, config.resumo_18);
    await scheduleHour(23, config.resumo_23);
    
    console.log('Todas as notificações de resumo foram agendadas');
  } catch (error) {
    console.error('Erro ao agendar notificações de resumo:', error);
  }
}

// Define a tarefa de background
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Erro na tarefa de background:', error);
    return;
  }
  
  try {
    console.log('Executando tarefa de background de notificações');
    const companyId = await AsyncStorage.getItem('monitoringCompanyId');
    if (companyId) {
      console.log('Executando tarefa de background para companyId:', companyId);
      await checkForNewNotifications(Number(companyId));
    } else {
      console.log('CompanyId não encontrado no AsyncStorage');
    }
  } catch (error) {
    console.error('Erro na execução da tarefa de background:', error);
  }
});

// Inicia monitoramento de notificações em segundo plano
export async function startNotificationMonitoring(companyId: number) {
  try {
    console.log(`Iniciando monitoramento para companyId: ${companyId}`);
    await AsyncStorage.setItem('monitoringCompanyId', String(companyId));
    
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (!isRegistered) {
      await TaskManager.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 2, // 2 segundos para testes
      });
      console.log('Tarefa de background registrada com sucesso');
    } else {
      console.log('Tarefa de background já estava registrada');
    }
    
    // Inicia um intervalo para verificar notificações enquanto o app está ativo
    const intervalId = setInterval(async () => {
      await checkForNewNotifications(companyId);
    }, 2000); // 2 segundos
    
    await AsyncStorage.setItem('notificationIntervalId', String(intervalId));
    
    console.log('Monitoramento de background iniciado para companyId:', companyId);
  } catch (error) {
    console.error('Erro ao iniciar monitoramento:', error);
  }
}

// Para monitoramento de notificações em segundo plano
export async function stopNotificationMonitoring() {
  try {
    console.log('Parando monitoramento de notificações');
    
    // Para o intervalo ativo
    const intervalIdStr = await AsyncStorage.getItem('notificationIntervalId');
    if (intervalIdStr) {
      clearInterval(Number(intervalIdStr));
      await AsyncStorage.removeItem('notificationIntervalId');
      console.log('Intervalo de notificações parado');
    }
    
    // Desregistra a tarefa de background
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      await TaskManager.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('Tarefa de background desregistrada');
    }
    
    await AsyncStorage.removeItem('monitoringCompanyId');
    console.log('Monitoramento de background parado');
  } catch (error) {
    console.error('Erro ao parar monitoramento:', error);
  }
}

