import { useEffect } from 'react'
import { App, Button, Form, Input, Spin, Tag } from 'antd'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userService } from '../userService'
import { useAuthStore, parseJwt } from '@/store/authStore'
import styles from './ProfilePage.module.css'

const ROLE_LABEL: Record<string, string> = {
  ADMIN:    'Administrador',
  GERENTE:  'Gerente',
  VENDEDOR: 'Vendedor',
}

export default function ProfilePage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const setAuth = useAuthStore(s => s.setAuth)
  const token   = useAuthStore(s => s.token)

  const [form] = Form.useForm()

  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn:  userService.getMe,
  })

  useEffect(() => {
    if (me) {
      form.setFieldsValue({ name: me.name, login: me.login, password: '' })
    }
  }, [me, form])

  const mutation = useMutation({
    mutationFn: (values: { name: string; password?: string }) =>
      userService.updateMe({ name: values.name, ...(values.password ? { password: values.password } : {}) }),
    onSuccess: (updated) => {
      message.success('Perfil atualizado com sucesso!')
      qc.invalidateQueries({ queryKey: ['users', 'me'] })
      form.setFieldValue('password', '')
      if (token) {
        const parsed = parseJwt(token)
        if (parsed) {
          setAuth(token, { ...parsed, name: updated.name })
        }
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao atualizar perfil.')
    },
  })

  const onFinish = (values: { name: string; password?: string }) => {
    mutation.mutate(values)
  }

  if (isLoading) {
    return <div className={styles.center}><Spin size="large" /></div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.avatar}>{(me?.name ?? 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}</div>
          <div className={styles.userMeta}>
            <div className={styles.userName}>{me?.name}</div>
            <div className={styles.userLogin}>{me?.login}</div>
            <div className={styles.tags}>
              <Tag color="blue">{ROLE_LABEL[me?.role ?? ''] ?? me?.role}</Tag>
              {me?.cargoName && <Tag color="geekblue">{me.cargoName}</Tag>}
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <Form form={form} layout="vertical" onFinish={onFinish} className={styles.form}>
          <Form.Item
            name="name"
            label={<span className={styles.fieldLabel}>Nome completo</span>}
            rules={[{ required: true, message: 'Informe o nome' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            name="login"
            label={<span className={styles.fieldLabel}>Login</span>}
          >
            <Input size="large" disabled />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className={styles.fieldLabel}>Nova senha (deixe em branco para manter)</span>}
            rules={[{ min: 6, message: 'Mínimo 6 caracteres' }]}
          >
            <Input.Password
              placeholder="Deixe em branco para não alterar"
              size="large"
              autoComplete="new-password"
              iconRender={(v) => v
                ? <EyeTwoTone twoToneColor="#378ADD" />
                : <EyeInvisibleOutlined style={{ color: '#85B7EB' }} />
              }
            />
          </Form.Item>

          <div className={styles.actions}>
            <Button
              type="primary"
              htmlType="submit"
              loading={mutation.isPending}
              className={styles.saveBtn}
              size="large"
            >
              Salvar alterações
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}
