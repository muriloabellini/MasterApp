import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  token?: string;
  refreshToken?: string;
  companyId?: number;
  empresaId?: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, recaptchaToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('authToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const companyId = await AsyncStorage.getItem('companyId');
        const empresaId = await AsyncStorage.getItem('empresaId');
        
        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          setUser({ 
            ...parsedUser, 
            token,
            refreshToken: refreshToken || undefined,
            companyId: companyId ? parseInt(companyId) : undefined,
            empresaId: empresaId ? parseInt(empresaId) : undefined
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const fetchCompanyId = async (token: string): Promise<{ companyId: number | null, empresaId: number | null }> => {
    try {
      const response = await fetch('https://api.masterpagamentosbr.com/v1/company', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }

      const data = await response.json();
      return {
        companyId: data.defaultRecipient?.id || null,
        empresaId: data.id || null // Assumindo que empresaId é o mesmo que companyId
      };
    } catch (error) {
      console.error('Error fetching company ID:', error);
      return { companyId: null, empresaId: null };
    }
  };

  const login = async (email: string, password: string, recaptchaToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await fetch('https://api.masterpagamentosbr.com/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.accessToken?.token) {
        // Primeiro armazenamos os dados básicos do usuário
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          phone: data.user.phone,
          isEmailVerified: data.user.isEmailVerified,
          isPhoneVerified: data.user.isPhoneVerified,
          createdAt: data.user.createdAt,
          token: data.accessToken.token,
          refreshToken: data.refreshToken.token
        };
        
        // Agora buscamos o companyId e empresaId
        const { companyId, empresaId } = await fetchCompanyId(data.accessToken.token);
        
        if (companyId && empresaId) {
          // Atualizamos os dados do usuário com os IDs
          const completeUserData = {
            ...userData,
            companyId,
            empresaId
          };
          
          setUser(completeUserData);
          await AsyncStorage.setItem('user', JSON.stringify(completeUserData));
          await AsyncStorage.setItem('authToken', data.accessToken.token);
          await AsyncStorage.setItem('refreshToken', data.refreshToken.token);
          await AsyncStorage.setItem('companyId', companyId.toString());
          await AsyncStorage.setItem('empresaId', empresaId.toString());
          
          return { success: true };
        } else {
          return { 
            success: false, 
            error: 'Não foi possível obter os IDs da empresa' 
          };
        }
      } else {
        return { 
          success: false, 
          error: data.message || 'Credenciais inválidas' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Erro de conexão. Verifique sua internet.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.multiRemove(['user', 'authToken', 'refreshToken', 'companyId', 'empresaId']);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAuthenticated = !!user?.token;

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}