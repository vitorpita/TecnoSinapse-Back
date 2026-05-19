import { useState } from 'react'
import { App, Button, Drawer, Form, Input, Modal, Popconfirm, Select, Spin, Tag, Tooltip, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userService, type UserRecord, type UserRole } from '../userService'
import { cargoService } from '@/features/cargos/cargoService'
import styles from './UsersPage.module.css'

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  ADMIN:    { label: 'Administrador', color: 'red'    },
  GERENTE:  { label: 'Gerente',       color: 'orange' },
  VENDEDOR: { label: 'Vendedor',      color: 'blue'   },
}

const roleOptions = [
  { value: 'ADMIN',    label: 'Administrador' },
  { value: 'GERENTE',  label: 'Gerente'       },
  { value: 'VENDEDOR', label: 'Vendedor'      },
]

const roleFilterOptions = [
  { value: '',         label: 'Todos os perfis' },
  { value: 'ADMIN',    label: 'Administradores' },
  { value: 'GERENTE',  label: 'Gerentes'        },
  { value: 'VENDEDOR', label: 'Vendedores'      },
]

export default function UsersPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [page,         setPage]         = useState(0)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editing,      setEditing]      = useState<UserRecord | null>(null)

  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn:  () => userService.list(page, 20, search || undefined),
  })

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos'],
    queryFn:  cargoService.list,
    staleTime: 1000 * 60 * 5,
  })

  const users = data?.content ?? []
  const filtered = users.filter(u => !roleFilter || u.role === roleFilter)

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      message.success('Usuário criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['users'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      if (status === 409) {
        message.error('Este login já está em uso.')
      } else {
        message.error(msg || 'Erro ao criar usuário.')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof userService.update>[1] }) =>
      userService.update(id, payload),
    onSuccess: () => {
      message.success('Usuário atualizado!')
      qc.invalidateQueries({ queryKey: ['users'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao atualizar usuário.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      message.success('Usuário inativado.')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao inativar usuário.')
    },
  })

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (user: UserRecord) => {
    setEditing(user)
    form.setFieldsValue({ name: user.name, login: user.login, role: user.role, password: '', cargoId: user.cargoId ?? null })
    setDrawerOpen(true)
  }

  const handleCloseRequest = () => {
    const values = form.getFieldsValue()
    const hasData = Object.values(values).some(v => !!v)
    if (hasData) setConfirmClose(true)
    else forceClose()
  }

  const forceClose = () => {
    setDrawerOpen(false)
    setConfirmClose(false)
    setEditing(null)
    form.resetFields()
  }

  const onFinish = (values: { name: string; login: string; password: string; role: UserRole; cargoId?: number | null }) => {
    if (editing) {
      const payload: Parameters<typeof userService.update>[1] = {
        name:    values.name,
        login:   values.login,
        role:    values.role,
        cargoId: values.cargoId ?? null,
        ...(values.password ? { password: values.password } : {}),
      }
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate({
        name:     values.name,
        login:    values.login,
        password: values.password,
        role:     values.role,
        cargoId:  values.cargoId ?? undefined,
      })
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className={styles.root}>

      {/* ── Toolbar ──────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <SearchOutlined className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por nome ou login..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleFilterOptions}
            style={{ width: 180 }}
            size="large"
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openNew} className={styles.newBtn}>
          Novo Usuário
        </Button>
      </div>

      {/* ── Tabela ───────────────────────────────── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Usuários do Sistema</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${data?.totalElements ?? 0} usuários`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}><Empty description="Nenhum usuário encontrado" /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th>Cargo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const role = ROLE_CONFIG[user.role] ?? { label: user.role, color: 'default' }
                return (
                  <tr key={user.id}>
                    <td className={styles.tdId}>#{user.id}</td>
                    <td className={styles.tdName}>{user.name}</td>
                    <td className={styles.tdLogin}>{user.login}</td>
                    <td><Tag color={role.color}>{role.label}</Tag></td>
                    <td>{user.cargoName ? <Tag color="geekblue">{user.cargoName}</Tag> : <span style={{ color: '#ccc', fontSize: 12 }}>—</span>}</td>
                    <td>
                      <div className={styles.actions}>
                        <Tooltip title="Editar">
                          <button className={styles.actionBtn} onClick={() => openEdit(user)}>
                            <EditOutlined />
                          </button>
                        </Tooltip>
                        <Popconfirm
                          title="Inativar usuário"
                          description="O usuário perderá acesso ao sistema."
                          onConfirm={() => deleteMutation.mutate(user.id)}
                          okText="Sim, inativar"
                          cancelText="Cancelar"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Inativar">
                            <button className={`${styles.actionBtn} ${styles.actionDanger}`}>
                              <DeleteOutlined />
                            </button>
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!isLoading && (data?.totalPages ?? 0) > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span className={styles.pageInfo}>Página {page + 1} de {data?.totalPages}</span>
            <button className={styles.pageBtn} disabled={page + 1 >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Próxima</button>
          </div>
        )}
      </div>

      {/* ── Drawer ───────────────────────────────── */}
      <Drawer
        title={<span className={styles.drawerTitle}>{editing ? `Editando: ${editing.name}` : 'Novo Usuário'}</span>}
        open={drawerOpen}
        onClose={handleCloseRequest}
        width={440}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={handleCloseRequest} disabled={saving}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()} className={styles.saveBtn}>
              {editing ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="name" label={<span className={styles.fieldLabel}>Nome completo</span>}
            rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: João Silva" size="large" />
          </Form.Item>

          <Form.Item name="login" label={<span className={styles.fieldLabel}>Login</span>}
            rules={[{ required: true, message: 'Informe o login' }]}>
            <Input placeholder="Ex: joao.silva" size="large" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className={styles.fieldLabel}>{editing ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</span>}
            rules={editing ? [] : [{ required: true, message: 'Informe a senha' }, { min: 6, message: 'Mínimo 6 caracteres' }]}
          >
            <Input.Password
              placeholder={editing ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'}
              size="large"
              autoComplete="new-password"
              iconRender={(v) => v ? <EyeTwoTone twoToneColor="#378ADD" /> : <EyeInvisibleOutlined style={{ color: '#85B7EB' }} />}
            />
          </Form.Item>

          <Form.Item name="role" label={<span className={styles.fieldLabel}>Perfil base</span>}
            rules={[{ required: true, message: 'Selecione o perfil' }]}>
            <Select options={roleOptions} placeholder="Selecione o perfil" size="large" />
          </Form.Item>

          <Form.Item name="cargoId" label={<span className={styles.fieldLabel}>Cargo (opcional)</span>}>
            <Select
              allowClear
              placeholder="Selecione um cargo customizado"
              size="large"
              options={cargos.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <div className={styles.roleInfo}>
            <span className={styles.roleInfoIcon}>ℹ️</span>
            <span>Se um cargo for atribuído, suas permissões substituem as do perfil base.</span>
          </div>
        </Form>
      </Drawer>

      <Modal
        open={confirmClose}
        onOk={forceClose}
        onCancel={() => setConfirmClose(false)}
        okText="Sim, descartar"
        cancelText="Continuar editando"
        okButtonProps={{ danger: true }}
        title="Descartar alterações?"
        centered
      >
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 300, color: '#555', margin: 0 }}>
          As alterações não salvas serão perdidas. Deseja continuar?
        </p>
      </Modal>
    </div>
  )
}