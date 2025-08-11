# Sistema de Notificações - Master Pagamentos

## Visão Geral

Este sistema implementa notificações locais completas para o aplicativo Master Pagamentos, incluindo:

1. **Notificações de Transações**: Alertas automáticos para novas vendas e mudanças de status
2. **Notificações de Resumo**: Relatórios programados em horários específicos (8h, 12h, 18h, 23h)
3. **Modelos de Mensagem**: Três estilos diferentes (Criativo, Descolado, Formal)

## Arquivos Modificados/Criados

### 1. `/services/notificationService.ts` (NOVO)
Serviço principal que gerencia todas as funcionalidades de notificação:

- **Configuração inicial** do Expo Notifications
- **Solicitação de permissões** para notificações
- **Formatação de mensagens** baseada no status e método de pagamento
- **Busca de dados** do backend para notificações de transação
- **Agendamento** de notificações de resumo
- **Monitoramento automático** de novas transações

### 2. `/hooks/useNotifications.ts` (ATUALIZADO)
Hook personalizado que integra o sistema de notificações com os componentes React:

- **Inicialização automática** do sistema
- **Gerenciamento de estado** das notificações
- **Configuração de listeners** para notificações recebidas
- **Funções utilitárias** para configurar e verificar notificações

### 3. `/app/(tabs)/notificacoes.tsx` (ATUALIZADO)
Tela de configuração de notificações:

- **Integração** com o novo sistema de notificações
- **Verificação de permissões** antes de salvar configurações
- **Configuração automática** das notificações locais após salvar

### 4. `/app/_layout.tsx` (ATUALIZADO)
Layout principal do aplicativo:

- **Inicialização** do sistema de notificações na inicialização do app

## Funcionalidades Implementadas

### Notificações de Transação

O sistema monitora automaticamente o endpoint de notificações e exibe alertas para:

- **Venda Gerada**: Quando `status_pagamento` é `waiting_payment`
- **Pagamento Confirmado**: Quando `status_pagamento` é `paid`
- **Outras atualizações**: Para outros status de pagamento

**Formato das mensagens:**
```
Título: "Venda Gerada" ou "Pagamento Confirmado"
Corpo: "Nova venda de R$ 101,91 aguardando pagamento via PIX"
```

### Notificações de Resumo

Notificações programadas em horários específicos com mensagens personalizadas:

**Horários disponíveis:**
- 08:00 - Relatório matinal
- 12:00 - Resumo do meio-dia
- 18:00 - Relatório vespertino
- 23:00 - Fechamento do dia

**Modelos de mensagem:**

1. **Criativo**: Mensagens motivacionais e positivas
   - "Comece seu dia no verde: sua operação já movimentou R$ 1.234,56 até agora."

2. **Descolado**: Linguagem moderna e jovem
   - "E aí, já viu a grana rodar hoje? Sua operação bateu R$ 1.234,56 até agora."

3. **Formal**: Comunicação profissional
   - "Atualização das 08h: sua operação já registrou R$ 1.234,56 em transações."

### Monitoramento Automático

- **Verificação periódica**: A cada 30 segundos busca novas transações
- **Filtro inteligente**: Só exibe notificações para transações não lidas
- **Controle de timestamp**: Evita notificações duplicadas

## Como Usar

### 1. Configuração Inicial

O sistema é inicializado automaticamente quando o app é aberto. As permissões são solicitadas na primeira configuração.

### 2. Configurar Notificações de Resumo

1. Acesse a tela "Notificações" no app
2. Ative os horários desejados (8h, 12h, 18h, 23h)
3. Escolha o modelo de mensagem (Criativo, Descolado, Formal)
4. Clique em "Salvar Configurações"

### 3. Monitoramento de Transações

O monitoramento é automático e funciona em segundo plano enquanto o app está ativo.

## Endpoints Utilizados

### Buscar Notificações de Transação
```
GET https://master.bellinitech.com.br/buscar_notificacoes.php?company_id={empresaId}
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "tipo": "transaction",
      "valor": 10191,
      "company_id": 89859,
      "status_pagamento": "waiting_payment",
      "metodo_pagamento": "pix",
      "lida": 0,
      "criada_em": "2025-08-11 04:29:28"
    }
  ],
  "count": 1
}
```

### Buscar Dados de Resumo
```
GET https://master.bellinitech.com.br/buscar_resumo.php?company_id={empresaId}
```

**Resposta esperada:**
```json
{
  "success": true,
  "total": 123456
}
```

### Salvar Configurações
```
POST https://master.bellinitech.com.br/salvar_config.php
```

**Payload:**
```json
{
  "id": 0,
  "company_id": 89859,
  "resumo_8": 1,
  "resumo_12": 1,
  "resumo_18": 0,
  "resumo_23": 1,
  "modelo": 1
}
```

## Dependências

O sistema utiliza as seguintes dependências já presentes no projeto:

- `expo-notifications`: Para notificações locais
- `expo-task-manager`: Para tarefas em segundo plano
- `@react-native-async-storage/async-storage`: Para armazenamento local
- `axios`: Para chamadas HTTP

## Permissões Necessárias

### Android
```json
{
  "android": {
    "permissions": [
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE"
    ]
  }
}
```

### iOS
As permissões são solicitadas automaticamente pelo Expo Notifications.

## Configuração no app.json

```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/images/icone.png",
        "color": "#1C1B1F",
        "mode": "production"
      }
    ]
  ]
}
```

## Troubleshooting

### Notificações não aparecem
1. Verifique se as permissões foram concedidas
2. Confirme se o usuário está logado com `empresaId` válido
3. Verifique os logs do console para erros

### Notificações duplicadas
- O sistema controla automaticamente via timestamp da última verificação
- Se persistir, limpe o AsyncStorage do app

### Problemas de conectividade
- O sistema funciona offline para notificações já agendadas
- Novas transações só são detectadas com conexão à internet

## Próximos Passos

1. **Implementar navegação**: Ao clicar na notificação, navegar para tela específica
2. **Adicionar sons personalizados**: Para diferentes tipos de notificação
3. **Implementar badges**: Contador de notificações não lidas
4. **Background tasks**: Para monitoramento mesmo com app fechado
5. **Push notifications**: Para notificações remotas via servidor

## Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Logs do console do aplicativo
- Arquivo de configuração em `/services/notificationService.ts`

