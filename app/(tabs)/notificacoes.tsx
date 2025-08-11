import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Clock, MessageSquare, Menu } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import SideMenu from '@/components/SideMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import axios from 'axios';
import { router } from 'expo-router';

interface HorariosState {
  h8: boolean;
  h12: boolean;
  h18: boolean;
  h23: boolean;
}

interface TipoTexto {
  id: string;
  title: string;
  description: string;
}

interface Configuracao {
  id: number;
  status: number;
  resumo_8: number;
  resumo_12: number;
  resumo_18: number;
  resumo_23: number;
  modelo: number;
  company_id: number;
}

export default function NotificacoesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { configureSummaryNotifications, hasPermission, requestPermissions } = useNotifications();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasCompany, setHasCompany] = useState(true);
  const [configExistente, setConfigExistente] = useState<Configuracao | null>(null);
  
  const [horarios, setHorarios] = useState<HorariosState>({
    h8: false,
    h12: false,
    h18: false,
    h23: false,
  });

  const [tipoTexto, setTipoTexto] = useState('1');

  useEffect(() => {
    fetchConfigurations();
  }, [user?.empresaId]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      
      if (!user || !user.empresaId) {
        setHasCompany(false);
        resetToDefaultSettings();
        return;
      }

      const response = await axios.get(
        `https://master.bellinitech.com.br/buscar_config.php?company_id=${user.empresaId}`
      );
      
      console.log('Resposta do backend:', response.data); // Log para debug
      
      // Verifica se a resposta contém dados válidos
      if (response.data && typeof response.data.status !== 'undefined') {
        const configData = response.data.config || {
          resumo_8: false,
          resumo_12: false,
          resumo_18: false,
          resumo_23: false,
          modelo: 1
        };

        // Atualiza os estados com os valores do backend
        setHorarios({
          h8: configData.resumo_8 === true || configData.resumo_8 === 1,
          h12: configData.resumo_12 === true || configData.resumo_12 === 1,
          h18: configData.resumo_18 === true || configData.resumo_18 === 1,
          h23: configData.resumo_23 === true || configData.resumo_23 === 1,
        });
        
        setTipoTexto(configData.modelo ? configData.modelo.toString() : '1');
        setHasCompany(true);
        
        // Atualiza configExistente para uso posterior no salvamento
        setConfigExistente({
          id: response.data.id || 0,
          status: response.data.status || 0,
          resumo_8: configData.resumo_8 ? 1 : 0,
          resumo_12: configData.resumo_12 ? 1 : 0,
          resumo_18: configData.resumo_18 ? 1 : 0,
          resumo_23: configData.resumo_23 ? 1 : 0,
          modelo: configData.modelo || 1,
          company_id: user.empresaId
        });
      } else {
        resetToDefaultSettings();
        setHasCompany(true);
        setConfigExistente(null);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações. Tente novamente mais tarde.');
      resetToDefaultSettings();
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaultSettings = () => {
    setHorarios({
      h8: false,
      h12: false,
      h18: false,
      h23: false,
    });
    setTipoTexto('1');
  };

  const toggleHorario = (horario: keyof HorariosState) => {
    if (!hasCompany) return;
    
    setHorarios(prev => ({
      ...prev,
      [horario]: !prev[horario]
    }));
  };

  const salvarConfiguracoes = async () => {
    try {
      if (!user || !user.empresaId) {
        Alert.alert(
          'Atenção', 
          'Você precisa estar vinculado a uma empresa para salvar configurações.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Verifica se tem permissão para notificações
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permissão Necessária',
            'Para receber notificações, é necessário conceder permissão nas configurações do dispositivo.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      setSaving(true);

      // Prepara o payload com id=0 quando for nova configuração
      const payload = {
        id: configExistente?.id || 0,
        company_id: user.empresaId,
        resumo_8: horarios.h8 ? 1 : 0,
        resumo_12: horarios.h12 ? 1 : 0,
        resumo_18: horarios.h18 ? 1 : 0,
        resumo_23: horarios.h23 ? 1 : 0,
        modelo: parseInt(tipoTexto) || 1,
      };

      console.log('Enviando para o servidor:', payload);

      const response = await axios.post(
        'https://master.bellinitech.com.br/salvar_config.php',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('Resposta do servidor:', response.data);

      if (response.data.success) {
        // Configura as notificações locais
        try {
          await configureSummaryNotifications({
            resumo_8: horarios.h8,
            resumo_12: horarios.h12,
            resumo_18: horarios.h18,
            resumo_23: horarios.h23,
            modelo: parseInt(tipoTexto) as 1 | 2 | 3,
          });
        } catch (notificationError) {
          console.error('Erro ao configurar notificações locais:', notificationError);
          // Não bloqueia o salvamento se houver erro nas notificações
        }

        Alert.alert(
          'Sucesso',
          response.data.message || 'Configurações salvas com sucesso! As notificações foram configuradas.',
          [{ text: 'OK', onPress: () => fetchConfigurations() }]
        );
      } else {
        throw new Error(response.data.error || 'Falha ao salvar configurações');
      }
    } catch (error: any) {
      console.error('Erro detalhado:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'Não foi possível salvar as configurações. Tente novamente mais tarde.';
      
      if (error.response) {
        if (error.response.status === 500) {
          errorMessage = 'Erro no servidor. Por favor, tente novamente mais tarde.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      }

      Alert.alert('Erro', errorMessage, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const tiposTexto: TipoTexto[] = [
    {
      id: '1',
      title: 'Textos Criativos',
      description: 'Mensagens divertidas e descontraídas para engajar seus clientes'
    },
    {
      id: '2',
      title: 'Textos Descolados',
      description: 'Linguagem moderna e jovem para se conectar com o público'
    },
    {
      id: '3',
      title: 'Textos Formais',
      description: 'Comunicação profissional e elegante para seu negócio'
    }
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
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
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionIcon: {
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: hasCompany ? 1 : 0.5,
    },
    horarioItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    horarioItemLast: {
      borderBottomWidth: 0,
    },
    horarioText: {
      fontSize: 16,
      color: colors.text,
    },
    horarioSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    tipoTextoContainer: {
      gap: 12,
    },
    tipoTextoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      opacity: hasCompany ? 1 : 0.5,
    },
    tipoTextoItemActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    tipoTextoRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipoTextoRadioActive: {
      borderColor: colors.primary,
    },
    tipoTextoRadioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    tipoTextoContent: {
      flex: 1,
    },
    tipoTextoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    tipoTextoDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
      opacity: saving || !hasCompany ? 0.5 : 1,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    linkButton: {
      marginTop: 20,
      padding: 10,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    linkButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Carregando configurações...</Text>
      </View>
    );
  }

  if (!hasCompany) {
    return (
      <View style={styles.container}>
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
          <Text style={styles.title}>Notificações</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Você precisa estar vinculado a uma empresa para configurar notificações.
          </Text>
        </View>
        
        <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      </View>
    );
  }

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
        <Text style={styles.title}>Notificações</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Horários de Notificação</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Escolha os horários em que deseja receber notificações sobre suas vendas e movimentações financeiras.
          </Text>
          
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.horarioItem}
              onPress={() => toggleHorario('h8')}
              disabled={!hasCompany}
            >
              <View>
                <Text style={styles.horarioText}>08:00</Text>
                <Text style={styles.horarioSubtext}>Relatório matinal</Text>
              </View>
              <Switch
                value={horarios.h8}
                onValueChange={() => toggleHorario('h8')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={horarios.h8 ? '#ffffff' : '#f4f3f4'}
                disabled={!hasCompany}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.horarioItem}
              onPress={() => toggleHorario('h12')}
              disabled={!hasCompany}
            >
              <View>
                <Text style={styles.horarioText}>12:00</Text>
                <Text style={styles.horarioSubtext}>Resumo do meio-dia</Text>
              </View>
              <Switch
                value={horarios.h12}
                onValueChange={() => toggleHorario('h12')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={horarios.h12 ? '#ffffff' : '#f4f3f4'}
                disabled={!hasCompany}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.horarioItem}
              onPress={() => toggleHorario('h18')}
              disabled={!hasCompany}
            >
              <View>
                <Text style={styles.horarioText}>18:00</Text>
                <Text style={styles.horarioSubtext}>Relatório vespertino</Text>
              </View>
              <Switch
                value={horarios.h18}
                onValueChange={() => toggleHorario('h18')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={horarios.h18 ? '#ffffff' : '#f4f3f4'}
                disabled={!hasCompany}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.horarioItem, styles.horarioItemLast]}
              onPress={() => toggleHorario('h23')}
              disabled={!hasCompany}
            >
              <View>
                <Text style={styles.horarioText}>23:00</Text>
                <Text style={styles.horarioSubtext}>Fechamento do dia</Text>
              </View>
              <Switch
                value={horarios.h23}
                onValueChange={() => toggleHorario('h23')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={horarios.h23 ? '#ffffff' : '#f4f3f4'}
                disabled={!hasCompany}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MessageSquare size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Estilo das Mensagens</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Escolha o tom das mensagens que você receberá nas notificações.
          </Text>

          <View style={styles.tipoTextoContainer}>
            {tiposTexto.map((tipo) => (
              <TouchableOpacity
                key={tipo.id}
                style={[
                  styles.tipoTextoItem,
                  tipoTexto === tipo.id && styles.tipoTextoItemActive
                ]}
                onPress={() => hasCompany && setTipoTexto(tipo.id)}
                disabled={saving || !hasCompany}
              >
                <View style={[
                  styles.tipoTextoRadio,
                  tipoTexto === tipo.id && styles.tipoTextoRadioActive
                ]}>
                  {tipoTexto === tipo.id && (
                    <View style={styles.tipoTextoRadioInner} />
                  )}
                </View>
                <View style={styles.tipoTextoContent}>
                  <Text style={styles.tipoTextoTitle}>{tipo.title}</Text>
                  <Text style={styles.tipoTextoDescription}>{tipo.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={salvarConfiguracoes}
          disabled={saving || !hasCompany}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Configurações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}