import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, Input, Button, Alert } from 'antd'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { useAuthStore, parseJwt } from '@/store/authStore'
import { authService } from '../authService'
import styles from './LoginPage.module.css'

const schema = z.object({
  login: z.string().min(1, 'Informe o login'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    try {
      const { token } = await authService.login(values)
      const user = parseJwt(token)
      if (!user) throw new Error('Token inválido')
      setAuth(token, user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login ou senha inválidos. Verifique suas credenciais.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.formSide}>
        <div className={styles.card}>

          <div className={styles.cardHeader}>
            <img src="/Logo.png" alt="TecnoSinapse" className={styles.cardLogo} />
            <p className={styles.cardSubtitle}>Acesso ao sistema</p>
            <div className={styles.cardAccent} />
          </div>

          <div className={styles.cardBody}>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 20, borderRadius: 6, fontSize: 12 }}
              />
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Form layout="vertical" requiredMark={false} component={false}>

                <Form.Item
                  label={<span className={styles.fieldLabel}>Login</span>}
                  validateStatus={errors.login ? 'error' : ''}
                  help={errors.login?.message}
                  required={false}
                >
                  <Controller
                    name="login"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        size="large"
                        placeholder="Seu login de acesso"
                        autoComplete="username"
                        className={styles.input}
                        prefix={
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#85B7EB" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        }
                      />
                    )}
                  />
                </Form.Item>

                <Form.Item
                  label={<span className={styles.fieldLabel}>Senha</span>}
                  validateStatus={errors.password ? 'error' : ''}
                  help={errors.password?.message}
                  style={{ marginBottom: 24 }}
                  required={false}
                >
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <Input.Password
                        {...field}
                        size="large"
                        placeholder="Sua senha"
                        autoComplete="current-password"
                        className={styles.input}
                        iconRender={(visible) =>
                          visible ? (
                            <EyeTwoTone twoToneColor="#378ADD" />
                          ) : (
                            <EyeInvisibleOutlined style={{ color: '#85B7EB' }} />
                          )
                        }
                        prefix={
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#85B7EB" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        }
                      />
                    )}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  block
                  className={styles.submitBtn}
                >
                  {loading ? 'Autenticando...' : 'Entrar no sistema'}
                </Button>

              </Form>
            </form>
          </div>

          <div className={styles.cardFooter}>
            <span>TecnoSinapse © {new Date().getFullYear()}</span>
          </div>

        </div>
      </div>
    </div>
  )
}