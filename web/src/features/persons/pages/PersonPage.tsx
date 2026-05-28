import React, { useState } from 'react'
import {
  Drawer, Form, Input, Row, Col, Button,
  Spin, Modal, Tag, Tooltip, Popconfirm, Select, Empty, App, Switch
} from 'antd'
import {
  Save, X, Eye, Trash2, Search, Pencil, RefreshCw,
} from 'lucide-react'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cpf, cnpj } from 'cpf-cnpj-validator'
import { personService, type CreatePersonRequest, type PersonRecord } from '../personService'
import { buscarCep } from '@/libs/viacep'
import { buscarCnpj } from '@/libs/brasilApi'
import { usePermission } from '@/hooks/usePermission'
import styles from './PersonPage.module.css'

const PERSON_TYPE_OPTIONS = [
  { value: 'CLIENTE',     label: 'Cliente'     },
  { value: 'FORNECEDOR',  label: 'Fornecedor'  },
  { value: 'COLABORADOR', label: 'Colaborador' },
]

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  CLIENTE:      { label: 'Cliente',      color: 'blue'   },
  FORNECEDOR:   { label: 'Fornecedor',   color: 'orange' },
  COLABORADOR:  { label: 'Colaborador',  color: 'purple' },
  TRANSPORTADORA: { label: 'Transportadora', color: 'cyan' },
}

const roleFilterOptions = [
  { value: '',             label: 'Todos os tipos' },
  { value: 'CLIENTE',      label: 'Clientes'       },
  { value: 'FORNECEDOR',   label: 'Fornecedores'   },
  { value: 'COLABORADOR',  label: 'Colaboradores'  },
]

const maskCpfCnpj = (value: string) => {
  if (!value) return value
  let v = value.replace(/\D/g, '')
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, '$1.$2')
             .replace(/(\d{3})(\d)/, '$1.$2')
             .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return v.replace(/^(\d{2})(\d)/, '$1.$2')
           .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
           .replace(/\.(\d{3})(\d)/, '.$1/$2')
           .replace(/(\d{4})(\d)/, '$1-$2')
           .substring(0, 18)
}

const maskPhone = (value: string) => {
  if (!value) return value
  let v = value.replace(/\D/g, '')
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
  v = v.replace(/(\d)(\d{4})$/, '$1-$2')
  return v.substring(0, 15)
}

const maskCep = (value: string) => {
  if (!value) return value
  return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9)
}

export default function PersonPage() {
  const { has, isAdmin } = usePermission()
  const canWrite = isAdmin || has('person:write')
  const [open,           setOpen]           = useState(false)
  const [confirmClose,   setConfirmClose]   = useState(false)
  const [viewingPerson,  setViewingPerson]  = useState<PersonRecord | null>(null)
  const [isEditing,      setIsEditing]      = useState(false)
  const [loadingCep,     setLoadingCep]     = useState(false)
  const [loadingCnpj,    setLoadingCnpj]    = useState(false)
  const [search,         setSearch]         = useState('')
  const [roleFilter,     setRoleFilter]     = useState('')
  const [page,           setPage]           = useState(0)
  const [showInactive,   setShowInactive]   = useState(false)

  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['persons', page, search, showInactive],
    queryFn:  () => personService.list(page, 20, search || undefined, showInactive),
  })

  const persons: PersonRecord[] = data?.content ?? []

  // Filtragem client-side por role
  const filtered = persons.filter((p) => {
    if (!roleFilter) return true
    return p.roles?.includes(roleFilter)
  })
  const { message } = App.useApp()

  const createMutation = useMutation({
    mutationFn: personService.create,
    onSuccess: () => {
      message.success('Cadastro realizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-suppliers'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const msg    = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.data?.message ?? ''
      if (status === 409) {
        message.error('Este CPF/CNPJ já está cadastrado no sistema.')
      } else {
        message.error(msg || 'Erro ao cadastrar. Verifique os dados e tente novamente.')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreatePersonRequest }) =>
      personService.update(id, payload),
    onSuccess: () => {
      message.success('Registro atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-suppliers'] })
      forceClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao atualizar.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: personService.delete,
    onSuccess: () => {
      message.success('Registro inativado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['persons'] })
    },
    onError: () => {
      message.error('Erro ao inativar registro.')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: personService.reactivate,
    onSuccess: () => {
      message.success('Cadastro reativado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['persons'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao reativar cadastro.')
    },
  })

  const showDrawer = () => {
    setViewingPerson(null)
    setIsEditing(false)
    form.resetFields()
    setOpen(true)
  }

  const handleViewDetails = (record: PersonRecord) => {
    setViewingPerson(record)
    setIsEditing(false)
    form.setFieldsValue({
      ...record,
      document: maskCpfCnpj(record.document ?? ''),
      phone:    maskPhone(record.phone ?? ''),
      cep:      maskCep(record.cep ?? ''),
    })
    setOpen(true)
  }

  const handleEditPerson = (record: PersonRecord) => {
    setViewingPerson(record)
    setIsEditing(true)
    form.setFieldsValue({
      ...record,
      document: maskCpfCnpj(record.document ?? ''),
      phone:    maskPhone(record.phone ?? ''),
      cep:      maskCep(record.cep ?? ''),
    })
    setOpen(true)
  }

  const handleCloseRequest = () => {
    if (viewingPerson && !isEditing) {
      forceClose()
      return
    }
    const fields = form.getFieldsValue()
    const hasData = Object.values(fields).some((val) => !!val)
    if (hasData) {
      setConfirmClose(true)
    } else {
      forceClose()
    }
  }

  const forceClose = () => {
    setOpen(false)
    setConfirmClose(false)
    setViewingPerson(null)
    setIsEditing(false)
    form.resetFields()
  }

  const onFinish = (values: Record<string, unknown>) => {
    const payload: CreatePersonRequest = {
      name:               values.name as string,
      document:           (values.document as string)?.replace(/\D/g, ''),
      email:              values.email as string | undefined,
      phone:              (values.phone as string)?.replace(/\D/g, '') || undefined,
      roles:              values.roles as string[],
      cep:                (values.cep as string)?.replace(/\D/g, '') || undefined,
      logradouro:         values.logradouro as string | undefined,
      numero:             values.numero as string | undefined,
      bairro:             values.bairro as string | undefined,
      cidade:             values.cidade as string | undefined,
      estado:             values.estado as string | undefined,
      stateRegistration:  (values.stateRegistration as string) || undefined,
    }
    if (viewingPerson && isEditing) {
      updateMutation.mutate({ id: viewingPerson.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDocumentBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
  const docValue = e.target.value.replace(/\D/g, '')
    if (docValue.length === 14 && cnpj.isValid(docValue)) {
      try {
        setLoadingCnpj(true)
        const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000))
        
        const cnpjData = await Promise.race([
          buscarCnpj(docValue),
          timeoutPromise,
        ])
        
        if (cnpjData) {
          form.setFieldsValue({
            name:       cnpjData.razao_social,
            cep:        maskCep(cnpjData.cep),
            logradouro: cnpjData.logradouro,
            numero:     cnpjData.numero,
            bairro:     cnpjData.bairro,
            cidade:     cnpjData.municipio,
            estado:     cnpjData.uf,
          })
        }
      } catch (error) {
      if (error instanceof Error) {
        message.warning(error.message === 'Timeout' 
          ? 'API de CNPJ indisponível. Preencha os dados manualmente.'
          : 'CNPJ não encontrado.')
        }
      } finally {
        setLoadingCnpj(false)
      }
    }
  }

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cepValue = e.target.value.replace(/\D/g, '')
    if (cepValue.length === 8) {
      try {
        setLoadingCep(true)
        const cepData = await buscarCep(cepValue)
        if (cepData) {
          form.setFieldsValue({
            logradouro: cepData.logradouro,
            bairro:     cepData.bairro,
            cidade:     cepData.localidade,
            estado:     cepData.uf,
          })
        }
      } catch {
        message.warning('CEP inválido.')
      } finally {
        setLoadingCep(false)
      }
    }
  }

  const getDrawerTitle = () => {
    if (viewingPerson && isEditing) return 'Editar Pessoa'
    if (viewingPerson) return 'Detalhes do Registro'
    return 'Cadastrar Pessoa'
  }

  return (
    <div className={styles.root}>

      {/* ── Tabela ─────────────────────────────── */}
      <div className={styles.tableSection}>

        {/* Toolbar */}
        <div className={styles.tableToolbar}>
          <div className={styles.tableToolbarLeft}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por nome ou documento..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              />
            </div>
            {!showInactive && (
              <Select
                value={roleFilter}
                onChange={(v) => setRoleFilter(v)}
                options={roleFilterOptions}
                style={{ width: 180 }}
                size="large"
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>
              <Switch
                size="small"
                checked={showInactive}
                onChange={(v) => { setShowInactive(v); setPage(0) }}
              />
              Mostrar inativos
            </div>
          </div>
          <div className={styles.tableToolbarRight}>
            <span className={styles.tableCount}>
              {isLoading ? '...' : `${data?.totalElements ?? 0} registros`}
            </span>
            {canWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showDrawer}
                size="large"
                className={styles.saveBtn}
              >
                Cadastrar Pessoa
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.centerState}>
            <Empty description="Nenhuma pessoa encontrada" />
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Contato</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td className={styles.tdName}>{record.name}</td>
                  <td className={styles.tdDoc}>{maskCpfCnpj(record.document ?? '')}</td>
                  <td>
                    {(record.roles ?? []).map((role) => {
                      const cfg = ROLE_LABELS[role] ?? { label: role, color: 'default' }
                      return <Tag key={role} color={cfg.color}>{cfg.label}</Tag>
                    })}
                  </td>
                  <td className={styles.tdContact}>
                    <span>{record.email ?? '—'}</span>
                    {record.phone && (
                      <span className={styles.tdPhone}>{maskPhone(record.phone)}</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Tooltip title="Ver detalhes">
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleViewDetails(record)}
                        >
                          <Eye size={14} />
                        </button>
                      </Tooltip>
                      {record.active !== false && canWrite && (
                        <>
                          <Tooltip title="Editar">
                            <button
                              className={styles.actionBtn}
                              onClick={() => handleEditPerson(record)}
                            >
                              <Pencil size={14} />
                            </button>
                          </Tooltip>
                          <Popconfirm
                            title="Inativar registro"
                            description="Deseja realmente inativar esta pessoa?"
                            onConfirm={() => deleteMutation.mutate(record.id)}
                            okText="Sim, inativar"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                          >
                            <Tooltip title="Inativar">
                              <button className={`${styles.actionBtn} ${styles.actionDanger}`}>
                                <Trash2 size={14} />
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        </>
                      )}
                      {record.active === false && canWrite && (
                        <Popconfirm
                          title="Reativar cadastro"
                          description="Deseja reativar este cadastro?"
                          onConfirm={() => reactivateMutation.mutate(record.id)}
                          okText="Sim, reativar"
                          cancelText="Cancelar"
                        >
                          <Tooltip title="Reativar">
                            <button className={styles.actionBtn} style={{ color: '#1D9E75' }}>
                              <RefreshCw size={14} />
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

        {/* Pagination simples */}
        {!isLoading && (data?.totalPages ?? 0) > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </button>
            <span className={styles.pageInfo}>
              Página {page + 1} de {data?.totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page + 1 >= (data?.totalPages ?? 1)}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* ── Drawer ─────────────────────────────── */}
      <Drawer
        title={
          <div className={styles.drawerHeader}>
            <span>{getDrawerTitle()}</span>
          </div>
        }
        width={600}
        onClose={handleCloseRequest}
        open={open}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <Button
              onClick={handleCloseRequest}
              icon={<X size={14} />}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {viewingPerson && !isEditing ? 'Fechar' : 'Cancelar'}
            </Button>
            {viewingPerson && !isEditing && canWrite && (
              <Button
                type="primary"
                icon={<Pencil size={14} />}
                onClick={() => setIsEditing(true)}
                className={styles.saveBtn}
              >
                Editar
              </Button>
            )}
            {(!viewingPerson || isEditing) && (
              <Button
                type="primary"
                onClick={() => form.submit()}
                icon={<Save size={14} />}
                loading={createMutation.isPending || updateMutation.isPending}
                className={styles.saveBtn}
              >
                Salvar Registro
              </Button>
            )}
          </div>
        }
      >
        <Spin spinning={loadingCnpj || loadingCep}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className={styles.form}
            disabled={!!viewingPerson && !isEditing}
            requiredMark
          >
            <Form.Item
              name="roles"
              label={<span className={styles.fieldLabel}>Tipo(s)</span>}
              rules={[{ required: true, message: 'Selecione ao menos um tipo' }]}
            >
              <Select
                mode="multiple"
                placeholder="Selecione o(s) tipo(s)"
                size="large"
                options={PERSON_TYPE_OPTIONS}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="document"
                  label={<span className={styles.fieldLabel}>CPF / CNPJ</span>}
                  normalize={maskCpfCnpj}
                  rules={[
                    {
                      validator: (_, value) => {
                        const v = (value ?? '').replace(/\D/g, '')
                        if (!v) return Promise.resolve()
                        if (v.length === 11 && cpf.isValid(v)) return Promise.resolve()
                        if (v.length === 14 && cnpj.isValid(v)) return Promise.resolve()
                        return Promise.reject(new Error('CPF ou CNPJ inválido'))
                      },
                    },
                  ]}
                >
                  <Input placeholder="000.000.000-00" onBlur={handleDocumentBlur} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label={<span className={styles.fieldLabel}>Nome / Razão Social</span>}
                  rules={[
                    { required: true, message: 'Informe o nome' },
                    { min: 3, message: 'Nome deve ter ao menos 3 caracteres' },
                    { max: 150, message: 'Nome muito longo (máx. 150 caracteres)' },
                  ]}
                >
                  <Input placeholder="Digite o nome" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label={<span className={styles.fieldLabel}>E-mail</span>}
                  rules={[{ type: 'email', message: 'E-mail inválido' }]}
                >
                  <Input placeholder="contato@email.com" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label={<span className={styles.fieldLabel}>Telefone</span>}
                  normalize={maskPhone}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve()
                        const digits = value.replace(/\D/g, '')
                        if (digits.length === 10 || digits.length === 11) return Promise.resolve()
                        return Promise.reject(new Error('Telefone incompleto'))
                      },
                    },
                  ]}
                >
                  <Input placeholder="(00) 00000-0000" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="stateRegistration"
              label={<span className={styles.fieldLabel}>Inscrição Estadual (IE)</span>}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    if (value.length <= 20) return Promise.resolve()
                    return Promise.reject(new Error('IE deve ter no máximo 20 caracteres'))
                  },
                },
              ]}
            >
              <Input placeholder="Ex: 123.456.789.012" size="large" maxLength={20} />
            </Form.Item>

            <div className={styles.sectionDivider}>Endereço</div>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="cep"
                  label={<span className={styles.fieldLabel}>CEP</span>}
                  normalize={maskCep}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve()
                        if (value.replace(/\D/g, '').length === 8) return Promise.resolve()
                        return Promise.reject(new Error('CEP inválido'))
                      },
                    },
                  ]}
                >
                  <Input placeholder="00000-000" onBlur={handleCepBlur} size="large" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="logradouro" label={<span className={styles.fieldLabel}>Logradouro</span>}>
                  <Input size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="numero" label={<span className={styles.fieldLabel}>Número</span>}>
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="bairro" label={<span className={styles.fieldLabel}>Bairro</span>}>
                  <Input size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="cidade" label={<span className={styles.fieldLabel}>Cidade</span>}>
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="estado"
                  label={<span className={styles.fieldLabel}>UF</span>}
                  normalize={(v: string) => v?.toUpperCase()}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve()
                        if (/^[A-Z]{2}$/.test(value)) return Promise.resolve()
                        return Promise.reject(new Error('UF inválida'))
                      },
                    },
                  ]}
                >
                  <Input maxLength={2} size="large" placeholder="SP" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Spin>
      </Drawer>

      {/* ── Modal de confirmação ────────────────── */}
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
          As informações preenchidas no formulário serão perdidas. Deseja continuar?
        </p>
      </Modal>
    </div>
  )
}