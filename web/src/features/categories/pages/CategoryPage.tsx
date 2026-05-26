import { useState } from 'react'
import { App, Button, Drawer, Form, Input, Modal, Popconfirm, Spin, Tooltip, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryService, type CategoryRecord } from '../categoryService'
import { usePermission } from '@/hooks/usePermission'
import styles from './CategoryPage.module.css'


const { TextArea } = Input

export default function CategoryPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { has, isAdmin } = usePermission()
  const canWrite = isAdmin || has('category:write')

  const [search,       setSearch]       = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editing,      setEditing]      = useState<CategoryRecord | null>(null)

  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoryService.list(0, 9999),
  })

  const allCategories = data?.content ?? []
  const categories = search
    ? allCategories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : allCategories

  const createMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: () => {
      message.success('Categoria criada com sucesso!')
      qc.invalidateQueries({ queryKey: ['categories'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      if (status === 409) {
        message.error('Já existe uma categoria com este nome.')
      } else {
        message.error(msg || 'Erro ao criar categoria.')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; description?: string } }) =>
      categoryService.update(id, payload),
    onSuccess: () => {
      message.success('Categoria atualizada!')
      qc.invalidateQueries({ queryKey: ['categories'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao atualizar categoria.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => {
      message.success('Categoria removida.')
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao remover categoria.')
    },
  })

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (cat: CategoryRecord) => {
    setEditing(cat)
    form.setFieldsValue({ name: cat.name, description: cat.description ?? '' })
    setDrawerOpen(true)
  }

  const handleCloseRequest = () => {
    const values = form.getFieldsValue()
    const hasData = Object.values(values).some((v) => !!v)
    if (hasData) {
      setConfirmClose(true)
    } else {
      forceClose()
    }
  }

  const forceClose = () => {
    setDrawerOpen(false)
    setConfirmClose(false)
    setEditing(null)
    form.resetFields()
  }

  const onFinish = (values: { name: string; description?: string }) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className={styles.root}>

      {/* ── Toolbar ──────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchOutlined className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canWrite && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openNew}
            className={styles.newBtn}
          >
            Nova Categoria
          </Button>
        )}
      </div>

      {/* ── Tabela ───────────────────────────────── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Categorias</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${categories.length} categoria${categories.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📂</div>
            <p className={styles.emptyText}>Nenhuma categoria encontrada</p>
            <p className={styles.emptySub}>Crie a primeira clicando em "Nova Categoria"</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className={styles.tdId}>#{cat.id}</td>
                  <td className={styles.tdName}>{cat.name}</td>
                  <td className={styles.tdDesc}>
                    {cat.description || <span className={styles.noDesc}>—</span>}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {canWrite && (
                        <Tooltip title="Editar">
                          <button className={styles.actionBtn} onClick={() => openEdit(cat)}>
                            <EditOutlined />
                          </button>
                        </Tooltip>
                      )}
                      {canWrite && (
                        <Popconfirm
                          title="Remover categoria"
                          description="Produtos vinculados perderão a categoria."
                          onConfirm={() => deleteMutation.mutate(cat.id)}
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
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* ── Drawer ───────────────────────────────── */}
      <Drawer
        title={
          <span className={styles.drawerTitle}>
            {editing ? `Editando: ${editing.name}` : 'Nova Categoria'}
          </span>
        }
        open={drawerOpen}
        onClose={handleCloseRequest}
        width={440}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={handleCloseRequest} disabled={saving}>Cancelar</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={() => form.submit()}
              className={styles.saveBtn}
            >
              {editing ? 'Salvar alterações' : 'Criar categoria'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label={<span className={styles.fieldLabel}>Nome</span>}
            rules={[{ required: true, message: 'Informe o nome da categoria' }]}
          >
            <Input placeholder="Ex: Tecido Plano, Malha, Jacquard..." size="large" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className={styles.fieldLabel}>Descrição</span>}
          >
            <TextArea
              placeholder="Descreva brevemente esta categoria (opcional)"
              rows={4}
              showCount
              maxLength={255}
              style={{ resize: 'none' }}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── Modal confirmação ─────────────────────── */}
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