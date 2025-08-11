import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { DollarSign, Menu, RefreshCw, Banknote, Landmark } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import SideMenu from '@/components/SideMenu';

type WithdrawMethod = 'pix' | 'ted';

export default function SaqueScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [cnpj, setCnpj] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('pix');

  // Formata o valor monetário (R$ 0,00) com melhor tratamento
  const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    let cleaned = value.replace(/\D/g, '');
    
    // Se vazio, retorna vazio
    if (cleaned === '') return '';
    
    // Adiciona zeros à esquerda para garantir centavos
    cleaned = cleaned.padStart(3, '0');
    
    // Formata como R$ 0,00
    const real = cleaned.slice(0, -2) || '0';
    const cents = cleaned.slice(-2);
    
    // Remove zeros à esquerda do valor real
    const formattedReal = parseInt(real, 10).toString();
    
    return `R$ ${formattedReal},${cents}`;
  };

  // Remove a formatação para enviar à API (valor em centavos)
  const parseCurrency = (value: string) => {
    if (!value) return 0;
    const cleaned = value.replace(/\D/g, '');
    return parseInt(cleaned, 10);
  };

  // Formata CNPJ (00.000.000/0000-00) com melhor validação
  const formatCNPJ = (value: string) => {
    if (!value) return value;
    
    const cleaned = value.replace(/\D/g, '');
    
    // Limita a 14 caracteres (tamanho do CNPJ sem máscara)
    const limited = cleaned.slice(0, 14);
    
    let formatted = limited;
    if (limited.length > 2) {
      formatted = `${limited.slice(0, 2)}.${limited.slice(2)}`;
    }
    if (limited.length > 5) {
      formatted = `${formatted.slice(0, 6)}.${formatted.slice(6)}`;
    }
    if (limited.length > 8) {
      formatted = `${formatted.slice(0, 10)}/${formatted.slice(10)}`;
    }
    if (limited.length > 12) {
      formatted = `${formatted.slice(0, 15)}-${formatted.slice(15)}`;
    }
    
    return formatted;
  };

  // Busca saldo disponível
  const fetchAvailableBalance = async () => {
    if (!user?.token || !user?.companyId) return;
    
    try {
      setIsRefreshing(true);
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
      setAvailableBalance(data.amount);
    } catch (error) {
      console.error('Error fetching available balance:', error);
      Alert.alert('Erro', 'Não foi possível carregar o saldo disponível');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Efetua o saque
  const handleWithdraw = async () => {
    if (withdrawMethod === 'pix' && !cnpj) {
      Alert.alert('Erro', 'Por favor, informe o CNPJ para saque PIX');
      return;
    }

    if (!amount) {
      Alert.alert('Erro', 'Por favor, informe o valor do saque');
      return;
    }

    const amountInCents = parseCurrency(amount);
    
    if (amountInCents < 10000) { // R$ 100,00 em centavos
      Alert.alert('Erro', 'O valor mínimo para saque é R$ 100,00');
      return;
    }

    if (amountInCents > availableBalance) {
      Alert.alert('Erro', 'Saldo insuficiente para realizar o saque');
      return;
    }

    setLoading(true);
    
    try {
      let body = {
        amount: amountInCents,
        postbackUrl: "https://webhook.masterpagamentos.app",
        recipientId: user?.companyId
      };

      if (withdrawMethod === 'pix') {
        const cleanedCnpj = cnpj.replace(/\D/g, '');
        body = { ...body, pixKey: cleanedCnpj };
      }

      const response = await fetch('https://api.masterpagamentosbr.com/v1/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao solicitar saque');
      }

      Alert.alert(
        'Sucesso', 
        `Saque de ${amount} via ${withdrawMethod.toUpperCase()} solicitado com sucesso!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setCnpj('');
              setAmount('');
              fetchAvailableBalance();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error requesting withdraw:', error);
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao solicitar o saque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableBalance();
  }, [user?.token, user?.companyId]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    menuButton: {
      padding: 8,
    },
    logo: {
      width: 120,
      height: 40,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    saldoCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    saldoInfo: {
      flex: 1,
    },
    saldoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    saldoValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: availableBalance > 0 ? colors.success : colors.text,
    },
    refreshButton: {
      padding: 8,
    },
    methodSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      gap: 12,
    },
    methodButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    methodButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    methodButtonText: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    methodButtonTextSelected: {
      color: colors.primary,
    },
    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    saqueButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    saqueButtonDisabled: {
      backgroundColor: '#1a4b8c', // Azul mais escuro para estado desativado
      shadowColor: '#000',
      shadowOpacity: 0.1,
    },
    saqueButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    saqueButtonTextDisabled: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    info: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
  });

  const isButtonDisabled = loading || 
    availableBalance <= 0 || 
    !amount || 
    (withdrawMethod === 'pix' && !cnpj) ||
    parseCurrency(amount) < 10000;

  return (
    <View style={styles.container}>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Menu size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Image 
            source={isDark ? require('@/assets/images/logoDark.png') : require('@/assets/images/logoWhite.png')} 
            style={styles.logo}
          />
          
          <View style={styles.menuButton} />
        </View>
        <Text style={styles.title}>Saque</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.saldoCard}>
          <View style={styles.saldoInfo}>
            <Text style={styles.saldoLabel}>Saldo Disponível</Text>
            <Text style={styles.saldoValue}>
              {isRefreshing ? 'Carregando...' : `R$ ${(availableBalance / 100).toFixed(2).replace('.', ',')}`}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchAvailableBalance}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              withdrawMethod === 'pix' && styles.methodButtonSelected
            ]}
            onPress={() => setWithdrawMethod('pix')}
          >
            <Landmark 
              size={24} 
              color={withdrawMethod === 'pix' ? colors.primary : colors.text} 
            />
            <Text style={[
              styles.methodButtonText,
              withdrawMethod === 'pix' && styles.methodButtonTextSelected
            ]}>
              PIX
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              withdrawMethod === 'ted' && styles.methodButtonSelected
            ]}
            onPress={() => setWithdrawMethod('ted')}
          >
            <Banknote 
              size={24} 
              color={withdrawMethod === 'ted' ? colors.primary : colors.text} 
            />
            <Text style={[
              styles.methodButtonText,
              withdrawMethod === 'ted' && styles.methodButtonTextSelected
            ]}>
              TED
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Valor do Saque</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(text) => setAmount(formatCurrencyInput(text))}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={15}
            />
          </View>

          {withdrawMethod === 'pix' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CNPJ da Conta</Text>
              <TextInput
                style={styles.input}
                value={cnpj}
                onChangeText={(text) => setCnpj(formatCNPJ(text))}
                placeholder="00.000.000/0000-00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={18}
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.saqueButton, 
            isButtonDisabled && styles.saqueButtonDisabled
          ]}
          onPress={handleWithdraw}
          disabled={isButtonDisabled}
        >
          <Text style={[
            styles.saqueButtonText,
            isButtonDisabled && styles.saqueButtonTextDisabled
          ]}>
            {loading ? 'Processando...' : 'Solicitar Saque'}
          </Text>
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Informações importantes</Text>
          
          {withdrawMethod === 'pix' ? (
            <Text style={styles.infoText}>
              • Saque PIX somente para CNPJ de mesma titularidade{'\n'}
              • Valor mínimo para saque: R$ 100,00{'\n'}
            </Text>
          ) : (
            <Text style={styles.infoText}>
              • O saque TED será realizado para a conta bancária cadastrada na Master{'\n'}
              • Valor mínimo para saque: R$ 100,00{'\n'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}