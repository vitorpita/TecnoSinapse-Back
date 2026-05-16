import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { StyleProvider } from '@ant-design/cssinjs'
import { queryClient } from '@/libs/queryClient'
import { antTheme } from '@/styles/antTheme'
import AppRouter from '@/routes/AppRouter'
import '@/styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={antTheme}
        locale={ptBR}
        form={{ validateMessages: { required: 'Este campo é obrigatório' } }}
      >
        <App>
          <StyleProvider layer>
            <AppRouter />
          </StyleProvider>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
)