import { useState } from 'react'
import { App, Button, Checkbox, Drawer, Form, Input, Modal, Popconfirm, Spin, Tag, Tooltip, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, KeyOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cargoService, ALL_PERMISSIONS, type CargoRecord, type CreateCargoRequest } from '../cargoService'
import styles from './CargoPage.module.css'

const permissionGroups = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
  if (!acc[p.group]) acc[p.group] = []
  acc[p.group].push(p)
  return acc
}, {})

export default function CargoPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [search,       setSearch]       = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editing,      setEditing]      = useState<CargoRecord | null>(null)

  const [form] = Form.useForm()

  const { data: cargos = [], isLoading } = useQuery({
    queryKey: ['cargos'],
    queryFn:  cargoService.list,
    staleTime: 0,
  })

  const filtered = cargos.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: (payload: CreateCargoRequest) => cargoService.create(payload),
    onSuccess: () => {
      message.success('Cargo criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['cargos'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      message.error(msg || 'Erro ao criar cargo.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateCargoRequest }) =>
      cargoService.update(id, payload),
    onSuccess: () => {
      message.success('Cargo atualizado!')
      qc.invalidateQueries({ queryKey: ['cargos'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      message.error(msg || 'Erro ao atualizar cargo.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: cargoService.delete,
    onSuccess: () => {
      message.success('Cargo removido.')
      qc.invalidateQueries({ queryKey: ['cargos'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      message.error(msg || 'Erro ao remover cargo.')
    },
  })

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (cargo: CargoRecord) => {
    setEditing(cargo)
    form.setFieldsValue({ name: cargo.name, description: cargo.description, permissions: cargo.permissions })
    setDrawerOpen(true)
  }

  const handleCloseRequest = () => {
    const values = form.getFieldsValue()
    const hasData = values.name || (values.permissions ?? []).length > 0
    if (hasData && !editing) setConfirmClose(true)
    else forceClose()
  }

  const forceClose = () => {
    setDrawerOpen(false)
    setConfirmClose(false)
    setEditing(null)
    form.resetFields()
  }

  const onFinish = (values: { name: string; description?: string; permissions: string[] }) => {
    const payload: CreateCargoRequest = {
      name: values.name,
      description: values.description,
      permissions: values.permissions ?? [],
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchOutlined className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openNew} className={styles.newBtn}>
          Novo Cargo
        </Button>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Cargos e Permissões</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${filtered.length} cargo${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}><Empty description="Nenhum cargo encontrado" /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Permissões</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cargo) => (
                <tr key={cargo.id}>
                  <td className={styles.tdId}>#{cargo.id}</td>
                  <td className={styles.tdName}>
                    <KeyOutlined style={{ marginRight: 6, color: '#378ADD' }} />
                    {cargo.name}
                  </td>
                  <td className={styles.tdDesc}>{cargo.description || <span className={styles.empty}>—</span>}</td>
                  <td className={styles.tdPerms}>
                    <Tag color="blue">{cargo.permissions.length} permissão{cargo.permissions.length !== 1 ? 'ões' : ''}</Tag>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Tooltip title="Editar">
                        <button className={styles.actionBtn} onClick={() => openEdit(cargo)}>
                          <EditOutlined />
                        </button>
                      </Tooltip>
                      <Popconfirm
                        title="Remover cargo"
                        description="Usuários com este cargo perderão estas permissões."
                        onConfirm={() => deleteMutation.mutate(cargo.id)}
                        okText="Sim, remover"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Remover">
                          <button className={`${styles.actionBtn} ${styles.actionDanger}`}>
                            <DeleteOutlined />
                          </button>
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer
        title={<span className={styles.drawerTitle}>{editing ? `Editando: ${editing.name}` : 'Novo Cargo'}</span>}
        open={drawerOpen}
        onClose={handleCloseRequest}
        width={520}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={handleCloseRequest} disabled={saving}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()} className={styles.saveBtn}>
              {editing ? 'Salvar alterações' : 'Criar cargo'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="name" label={<span className={styles.fieldLabel}>Nome do cargo</span>}
            rules={[{ required: true, message: 'Informe o nome' }, { max: 100, message: 'Máx. 100 caracteres' }]}>
            <Input placeholder="Ex: Vendedor Sênior" size="large" />
          </Form.Item>

          <Form.Item name="description" label={<span className={styles.fieldLabel}>Descrição</span>}>
            <Input placeholder="Descreva a função deste cargo" size="large" />
          </Form.Item>

          <div className={styles.permLabel}>Permissões</div>

          <Form.Item name="permissions" noStyle>
            <Checkbox.Group style={{ width: '100%' }}>
              {Object.entries(permissionGroups).map(([group, perms]) => (
                <div key={group} className={styles.permGroup}>
                  <div className={styles.permGroupTitle}>{group}</div>
                  {perms.map((p) => (
                    <div key={p.value} className={styles.permItem}>
                      <Checkbox value={p.value}>{p.label}</Checkbox>
                    </div>
                  ))}
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
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
