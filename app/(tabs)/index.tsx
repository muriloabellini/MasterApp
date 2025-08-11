import React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart,
  Menu,
  Sun,
  Moon,
  Calendar,
  ChevronDown,
  Lock,
  RefreshCw // Ícone de atualização
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import SideMenu from '@/components/SideMenu';

export default function DashboardScreen() {
  const { colors, isDark, setTheme, theme } = useTheme();
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Hoje');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState({
    saldoDisponivel: true,
    saldoPendente: true,
    reservaFinanceira: true,
    faturamento: true
  });
  const [dashboardData, setDashboardData] = useState({
    saldoDisponivel: 'R$ 0,00',
    saldoPendente: 'R$ 0,00',
    reservaFinanceira: 'R$ 0,00',
    faturamentoBruto: 'R$ 0,00',
    faturamentoLiquido: 'R$ 0,00',
    quantidadeVendasGeradas: 0,
    quantidadeVendasPagas: 0
  });

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100); // Dividindo por 100 se o valor vier em centavos
  };

  // Função para obter datas do mês atual
  const getCurrentMonthDates = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    return {
      from: firstDay.toISOString(),
      until: lastDay.toISOString()
    };
  };

  // Função para atualizar todos os dados
  const refreshAllData = async () => {
    try {
      setIsLoading({
        saldoDisponivel: true,
        saldoPendente: true,
        reservaFinanceira: true,
        faturamento: true
      });
      
      await Promise.all([
        fetchAvailableBalance(),
        fetchWaitingBalance(),
        fetchLockedFunds(),
        fetchMetrics()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Buscar saldo disponível
  const fetchAvailableBalance = async () => {
    if (!user?.token || !user?.companyId) return;
    
    try {
      setIsLoading(prev => ({...prev, saldoDisponivel: true}));
      const response = await fetch(`https://api.masterpagamentosbr.com/v1/balance/available?recipientId=${user.companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch available balance');

      const data = await response.json();
      setDashboardData(prev => ({
        ...prev,
        saldoDisponivel: formatCurrency(data.amount)
      }));
    } catch (error) {
      console.error('Error fetching available balance:', error);
    } finally {
      setIsLoading(prev => ({...prev, saldoDisponivel: false}));
    }
  };

  // Buscar saldo pendente
  const fetchWaitingBalance = async () => {
    if (!user?.token || !user?.companyId) return;
    
    try {
      setIsLoading(prev => ({...prev, saldoPendente: true}));
      const response = await fetch(`https://api.masterpagamentosbr.com/v1/balance/waiting?recipientId=${user.companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch waiting balance');

      const data = await response.json();
      setDashboardData(prev => ({
        ...prev,
        saldoPendente: formatCurrency(data.amount)
      }));
    } catch (error) {
      console.error('Error fetching waiting balance:', error);
    } finally {
      setIsLoading(prev => ({...prev, saldoPendente: false}));
    }
  };

  // Buscar reserva financeira
  const fetchLockedFunds = async () => {
    if (!user?.token || !user?.companyId) return;
    
    try {
      setIsLoading(prev => ({...prev, reservaFinanceira: true}));
      const response = await fetch(`https://api.masterpagamentosbr.com/v1/balance/locked_funds?recipientId=${user.companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch locked funds');

      const data = await response.json();
      setDashboardData(prev => ({
        ...prev,
        reservaFinanceira: formatCurrency(data.amount)
      }));
    } catch (error) {
      console.error('Error fetching locked funds:', error);
    } finally {
      setIsLoading(prev => ({...prev, reservaFinanceira: false}));
    }
  };

  // Buscar métricas de faturamento
  const fetchMetrics = async () => {
    if (!user?.token) return;
    
    try {
      setIsLoading(prev => ({...prev, faturamento: true}));
      const { from, until } = getCurrentMonthDates();
      const response = await fetch(`https://api.masterpagamentosbr.com/v1/metrics/conversion?&from=${from}&until=${until}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setDashboardData(prev => ({
        ...prev,
        faturamentoBruto: formatCurrency(data.total.amount.value),
        faturamentoLiquido: formatCurrency(data.total.paid.amount.value),
        quantidadeVendasGeradas: data.total.doc_count,
        quantidadeVendasPagas: data.total.paid.doc_count
      }));
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(prev => ({...prev, faturamento: false}));
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [user?.token, user?.companyId]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 50,
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    menuButton: {
      padding: 8,
    },
    themeButton: {
      padding: 8,
    },
    logoContainer: {
      flex: 1,
      alignItems: 'center',
    },
    logo: {
      width: 120,
      height: 40,
      resizeMode: 'contain',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    greetingContainer: {
      marginBottom: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    refreshButton: {
      padding: 8,
    },
    filterContainer: {
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    filterButtonText: {
      marginLeft: 8,
      color: colors.text,
      fontWeight: '500',
    },
    filterDropdown: {
      position: 'absolute',
      top: 40,
      left: 20,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      zIndex: 100,
      width: 120,
    },
    filterOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    filterOptionText: {
      color: colors.text,
    },
    cardsContainer: {
      gap: 20,
      paddingBottom: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardIcon: {
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    cardValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
    }
  });

  const CardComponent = ({ 
    icon, 
    title, 
    value, 
    loading,
    style 
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    loading: boolean;
    style?: any;
  }) => (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      {loading && (
        <Text style={styles.loadingText}>Carregando...</Text>
      )}
    </View>
  );

  const FilterComponent = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={() => setShowFilters(!showFilters)}
      >
        <Calendar size={16} color={colors.text} />
        <Text style={styles.filterButtonText}>{selectedFilter}</Text>
        <ChevronDown size={16} color={colors.text} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
      
      {showFilters && (
        <View style={styles.filterDropdown}>
          <TouchableOpacity 
            style={styles.filterOption} 
            onPress={() => {
              setSelectedFilter('Hoje');
              setShowFilters(false);
            }}
          >
            <Text style={styles.filterOptionText}>Hoje</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterOption} 
            onPress={() => {
              setSelectedFilter('7 dias');
              setShowFilters(false);
            }}
          >
            <Text style={styles.filterOptionText}>7 dias</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterOption} 
            onPress={() => {
              setSelectedFilter('30 dias');
              setShowFilters(false);
            }}
          >
            <Text style={styles.filterOptionText}>30 dias</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      
      {/* Header com logo centralizada */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
          <Menu size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image 
            source={isDark ? require('@/assets/images/logoDark.png') : require('@/assets/images/logoWhite.png')} 
            style={styles.logo}
          />
        </View>
        
        <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
          {isDark ? (
            <Sun size={24} color={colors.text} />
          ) : (
            <Moon size={24} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Saudação personalizada com botão de atualização */}
        <View style={styles.greetingContainer}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name.split(' ')[0] || 'Usuário'}!</Text>
            <Text style={styles.subtitle}>Confira seu resumo financeiro</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={refreshAllData}
          >
            <RefreshCw size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

      
       
        {/* Cards de métricas */}
        <View style={styles.cardsContainer}>
          <CardComponent
            icon={<DollarSign size={20} color={colors.text} />}
            title="Saldo Disponível"
            value={dashboardData.saldoDisponivel}
            loading={isLoading.saldoDisponivel}
          />

          <CardComponent
            icon={<Clock size={20} color={colors.text} />}
            title="Saldo Pendente"
            value={dashboardData.saldoPendente}
            loading={isLoading.saldoPendente}
          />

          <CardComponent
            icon={<Lock size={20} color={colors.text} />}
            title="Reserva Financeira"
            value={dashboardData.reservaFinanceira}
            loading={isLoading.reservaFinanceira}
          />

          <CardComponent
            icon={<TrendingUp size={20} color={colors.text} />}
            title="Faturamento Bruto"
            value={dashboardData.faturamentoBruto}
            loading={isLoading.faturamento}
          />

          <CardComponent
            icon={<TrendingDown size={20} color={colors.text} />}
            title="Faturamento Líquido"
            value={dashboardData.faturamentoLiquido}
            loading={isLoading.faturamento}
          />

          <CardComponent
            icon={<ShoppingCart size={20} color={colors.text} />}
            title="Vendas Geradas"
            value={dashboardData.quantidadeVendasGeradas.toLocaleString()}
            loading={isLoading.faturamento}
          />

          <CardComponent
            icon={<ShoppingCart size={20} color={colors.text} />}
            title="Vendas Pagas"
            value={dashboardData.quantidadeVendasPagas.toLocaleString()}
            loading={isLoading.faturamento}
          />
        </View>
      </ScrollView>
    </View>
  );
}