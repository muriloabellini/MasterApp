import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { 
  Chrome as Home, 
  CreditCard, 
  Bell, 
  LogOut,
  X
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function SideMenu({ visible, onClose }: SideMenuProps) {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
    router.replace('/login');
  };

  const navigateTo = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    menu: {
      width: width * 0.8,
      height: '100%',
      backgroundColor: colors.surface,
      paddingTop: 60,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      padding: 8,
    },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logo: {
      width: 120,
      height: 40,
      resizeMode: 'contain',
      marginBottom: 12,
    },
    userInfo: {
      // Removido o flexDirection: 'row' para que os elementos fiquem em coluna
    },
    masterIcon: {
      width: 32,
      height: 32,
      resizeMode: 'contain',
      marginRight: 12,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    menuItems: {
      paddingTop: 24,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    menuItemIcon: {
      marginRight: 16,
    },
    menuItemText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    logoutButton: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    logoutIcon: {
      marginRight: 16,
    },
    logoutText: {
      fontSize: 16,
      color: colors.error,
      fontWeight: '500',
    },
  });

  const menuItems = [
    {
      icon: <Home size={24} color={colors.text} />,
      title: 'Dashboard',
      route: '/(tabs)/'
    },
    {
      icon: <CreditCard size={24} color={colors.text} />,
      title: 'Saque',
      route: '/(tabs)/saque'
    },
    {
      icon: <Bell size={24} color={colors.text} />,
      title: 'Notificações',
      route: '/(tabs)/notificacoes'
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <TouchableOpacity style={styles.menu} activeOpacity={1}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={isDark ? require('@/assets/images/logoDark.png') : require('@/assets/images/logoWhite.png')} 
                style={styles.logo}
              />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.menuItems}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => navigateTo(item.route)}
              >
                <View style={styles.menuItemIcon}>{item.icon}</View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutIcon}>
              <LogOut size={24} color={colors.error} />
            </View>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}