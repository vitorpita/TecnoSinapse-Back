import { useEffect, useState, useCallback, useMemo } from 'react'
import { App, Drawer, Form, Select, Input, Button, InputNumber, Divider, Tag, Space, Spin, Modal, Alert } from 'antd'
import { MoneyInput } from '@/components/MoneyInput'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import type { OrderResponse, ProductOption } from '../types/order.types'
import { useOrderClients, useOrderSellers, useOrderProducts, useCreateOrder, useUpdateOrder } from '../hooks/useOrders'
import { cashRegisterService } from '@/features/cash-register/cashRegisterService'
import styles from './OrderFormDrawer.module.css'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'DINHEIRO',       label: 'Dinheiro'          },
  { value: 'PIX',            label: 'Pix'               },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO',  label: 'Cartão de Débito'  },
  { value: 'BOLETO',         label: 'Boleto'            },
  { value: 'TRANSFERENCIA',  label: 'Transferência'     },
  { value: 'CHEQUE',         label: 'Cheque'            },
]

const schema = z.object({
  clientId:         z.number({ required_error: 'Selecione o cliente' }),
  sellerId:         z.number({ required_error: 'Selecione o vendedor' }),
  paymentMethod:    z.string().optional(),
  paymentCondition: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number({ required_error: 'Selecione o produto' }),
      quantity:  z.number({ required_error: 'Informe a quantidade' }).positive('Quantidade deve ser maior que 0'),
      unitPrice: z.number({ required_error: 'Informe o preço' }).positive('Preço deve ser maior que 0'),
    })
  ).min(1, 'Adicione pelo menos um produto'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  order: OrderResponse | null
  onClose: () => void
}

interface SelectOption {
  id: number
  name: string
}

const INITIAL_FORM_STATE: FormValues = {
  clientId:         undefined as unknown as number,
  sellerId:         undefined as unknown as number,
  paymentMethod:    undefined,
  paymentCondition: undefined,
  items: [{ productId: undefined as unknown as number, quantity: 1, unitPrice: 0 }],
}

export default function OrderFormDrawer({ open, order, onClose }: Props) {
  const { message } = App.useApp()
  const isEdit = !!order

  const { data: currentCash } = useQuery({
    queryKey: ['cash-current'],
    queryFn:  cashRegisterService.getCurrentCash,
    enabled:  !isEdit,
  })

  const { data: clientsData, isLoading: loadingClients } = useOrderClients()
  const { data: sellersData, isLoading: loadingSellers } = useOrderSellers()
  const { data: productsData, isLoading: loadingProducts } = useOrderProducts()
  
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()

  const [confirmClose, setConfirmClose] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [sellerSearch, setSellerSearch] = useState('')

  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: INITIAL_FORM_STATE,
  })

  const { fields, append, prepend, remove, insert } = useFieldArray({ control, name: 'items' })

  const resetFormState = useCallback(() => {
    reset(INITIAL_FORM_STATE)
    setClientSearch('')
    setSellerSearch('')
  }, [reset])

  useEffect(() => {
    if (!open) return

    if (order) {
      reset({
        clientId:         order.clientId,
        sellerId:         order.sellerId,
        paymentMethod:    order.paymentMethod ?? undefined,
        paymentCondition: order.paymentCondition ?? undefined,
        items: order.items.map(i => ({
          productId: i.productId,
          quantity:  Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      })
    } else {
      resetFormState()
    }
  }, [order, reset, open, resetFormState])

  const items = watch('items')

  const total = useMemo(() =>
    items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0),
  [items])


  const products = productsData?.content ?? []
  const allClients = clientsData?.content ?? []

  const stockIssues = useMemo(() => {
    return items
      .map((item, index) => {
        const product = products.find((p: ProductOption) => p.id === item.productId)
        if (!product || !item.quantity) return null
        const available = Number(product.stockQuantity)
        const needed = Number(item.quantity)
        if (needed > available) {
          return { index, name: product.name, available, needed }
        }
        return null
      })
      .filter(Boolean) as { index: number; name: string; available: number; needed: number }[]
  }, [items, products])
  const allSellers = (sellersData?.content ?? []).filter(s => s.active !== false)

  const filteredClients = useMemo(() => {
    if (!clientSearch) return allClients
    return allClients.filter((c: SelectOption) => c.name?.toLowerCase().includes(clientSearch.toLowerCase()))
  }, [allClients, clientSearch])

  const filteredSellers = useMemo(() => {
    if (!sellerSearch) return allSellers
    return allSellers.filter((s: SelectOption) => s.name?.toLowerCase().includes(sellerSearch.toLowerCase()))
  }, [allSellers, sellerSearch])

  const handleProductChange = (productId: number, index: number) => {
    const product = products.find((p: ProductOption) => p.id === productId)
    if (product) {
      setValue(`items.${index}.unitPrice`, Number(product.unitPrice))
    }
  }

  const handleCloseRequest = () => {
    if (isDirty) {
      setConfirmClose(true)
    } else {
      handleConfirmClose()
    }
  }

  const handleConfirmClose = () => {
    setConfirmClose(false)
    resetFormState()
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    if (stockIssues.length > 0) return

    try {
      if (isEdit) {
        if (!order?.id) return
        await updateOrder.mutateAsync({ id: order.id, payload: values })
        message.success('Pedido atualizado com sucesso!')
      } else {
        await createOrder.mutateAsync(values)
        message.success('Pedido criado com sucesso!')
      }
      handleConfirmClose()
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (apiMsg) {
        message.error(apiMsg)
      }
    }
  }

  const loading = loadingClients || loadingSellers || loadingProducts
  const saving = createOrder.isPending || updateOrder.isPending

  return (
    <>
      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span>{isEdit ? `Editando Pedido #${order?.id}` : 'Novo Pedido'}</span>
            {isEdit && <Tag color="blue">{order?.status}</Tag>}
          </div>
        }
        open={open}
        onClose={handleCloseRequest}
        width={780}
        maskClosable={false}
        footer={
          <div className={styles.drawerFooter}>
            <div className={styles.totalLabel}>
              Total: <strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </div>
            <Space>
              <Button onClick={handleCloseRequest} disabled={saving}>
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={saving}
                disabled={(!isEdit && !currentCash) || stockIssues.length > 0}
                onClick={handleSubmit(onSubmit)}
                className={styles.saveBtn}
              >
                {isEdit ? 'Salvar alterações' : 'Criar pedido'}
              </Button>
            </Space>
          </div>
        }
      >
        {loading ? (
          <div className={styles.loadingWrap}>
            <Spin />
          </div>
        ) : (
          <form noValidate>
            <Form layout="vertical" component={false}>
              {!isEdit && !currentCash && (
                <Alert
                  type="error"
                  showIcon
                  message="Caixa fechado"
                  description="Não é possível criar pedidos sem um caixa aberto."
                  style={{ marginBottom: 16 }}
                />
              )}
              <Form.Item
                label={<span className={styles.fieldLabel}>Cliente</span>}
                validateStatus={errors.clientId ? 'error' : ''}
                help={errors.clientId?.message}
              >
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      placeholder="Buscar cliente por nome..."
                      optionFilterProp="label"
                      filterOption={false}
                      onSearch={setClientSearch}
                      onChange={(val) => {
                        field.onChange(val)
                        setClientSearch('')
                      }}
                      options={filteredClients.map((c: SelectOption) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      size="large"
                      notFoundContent={loadingClients ? <Spin size="small" /> : 'Nenhum cliente encontrado'}
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label={<span className={styles.fieldLabel}>Vendedor</span>}
                validateStatus={errors.sellerId ? 'error' : ''}
                help={errors.sellerId?.message}
              >
                <Controller
                  name="sellerId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      placeholder="Buscar vendedor por nome..."
                      optionFilterProp="label"
                      filterOption={false}
                      onSearch={setSellerSearch}
                      onChange={(val) => {
                        field.onChange(val)
                        setSellerSearch('')
                      }}
                      options={filteredSellers.map((u: SelectOption) => ({
                        value: u.id,
                        label: u.name,
                      }))}
                      size="large"
                      notFoundContent={loadingSellers ? <Spin size="small" /> : 'Nenhum vendedor encontrado'}
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label={<span className={styles.fieldLabel}>Forma de Pagamento</span>}
              >
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Selecione (obrigatório para faturar)"
                      options={PAYMENT_METHOD_OPTIONS}
                      allowClear
                      size="large"
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label={<span className={styles.fieldLabel}>Condição de Pagamento</span>}
              >
                <Controller
                  name="paymentCondition"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Ex: 30/60/90"
                      size="large"
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9/]/g, '')
                        field.onChange(val)
                      }}
                    />
                  )}
                />
              </Form.Item>

              {stockIssues.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  message="Estoque insuficiente"
                  description={
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {stockIssues.map(issue => (
                        <li key={issue.index}>
                          <strong>{issue.name}</strong>: solicitado {issue.needed.toLocaleString('pt-BR')}, disponível {issue.available.toLocaleString('pt-BR')}
                        </li>
                      ))}
                    </ul>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              <Divider className={styles.divider}>Produtos</Divider>

              {fields.map((field, index) => {
                const selectedProduct = products.find((p: ProductOption) => p.id === items[index]?.productId)
                return (
                  <div key={field.id} className={styles.itemRow}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemIndex}>Item {index + 1}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className={styles.addInlineBtn}
                          onClick={() => insert(index + 1, { productId: undefined as unknown as number, quantity: 1, unitPrice: 0 })}
                          title="Adicionar produto abaixo"
                        >
                          <PlusOutlined />
                        </button>
                        {fields.length > 1 && (
                          <button type="button" className={styles.removeBtn} onClick={() => remove(index)}>
                            <DeleteOutlined />
                          </button>
                        )}
                      </div>
                    </div>

                    <Form.Item
                      validateStatus={errors.items?.[index]?.productId ? 'error' : ''}
                      help={errors.items?.[index]?.productId?.message}
                      style={{ marginBottom: 10 }}
                    >
                      <Controller
                        name={`items.${index}.productId`}
                        control={control}
                        render={({ field: f }) => (
                          <Select
                            {...f}
                            showSearch
                            placeholder="Selecione o produto"
                            optionFilterProp="label"
                            size="large"
                            onChange={(val) => {
                              f.onChange(val)
                              handleProductChange(val, index)
                            }}
                            options={products.map((p: ProductOption) => ({
                              value: p.id,
                              label: `${p.name}${p.sku ? ` — ${p.sku}` : ''}`,
                            }))}
                          />
                        )}
                      />
                    </Form.Item>

                    {selectedProduct && (
                      <div className={styles.stockInfo}>
                        Estoque disponível: <strong>{Number(selectedProduct.stockQuantity).toLocaleString('pt-BR')}</strong>
                      </div>
                    )}

                    <div className={styles.itemInputs}>
                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Quantidade</span>}
                        validateStatus={errors.items?.[index]?.quantity ? 'error' : ''}
                        help={errors.items?.[index]?.quantity?.message}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Controller
                          name={`items.${index}.quantity`}
                          control={control}
                          render={({ field: f }) => (
                            <InputNumber
                              {...f}
                              min={0.01}
                              step={0.5}
                              precision={2}
                              decimalSeparator=","
                              formatter={(v) => String(v ?? '').replace('.', ',')}
                              parser={(v) => parseFloat((v ?? '').replace(/\./g, '').replace(',', '.')) || 0}
                              style={{ width: '100%' }}
                              size="large"
                            />
                          )}
                        />
                      </Form.Item>

                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Preço Unit.</span>}
                        validateStatus={errors.items?.[index]?.unitPrice ? 'error' : ''}
                        help={errors.items?.[index]?.unitPrice?.message}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Controller
                          name={`items.${index}.unitPrice`}
                          control={control}
                          render={({ field: f }) => (
                            <MoneyInput
                              {...f}
                              min={0.01}
                              style={{ width: '100%' }}
                              size="large"
                            />
                          )}
                        />
                      </Form.Item>

                      <div className={styles.subtotal}>
                        <span className={styles.fieldLabelSm}>Subtotal</span>
                        <div className={styles.subtotalValue}>
                          R${' '}
                          {((items[index]?.quantity ?? 0) * (items[index]?.unitPrice ?? 0)).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                className={styles.addItemBtn}
                onClick={() =>
                  prepend({
                    productId: undefined as unknown as number,
                    quantity: 1,
                    unitPrice: 0,
                  })
                }
              >
                <PlusOutlined /> Adicionar produto
              </button>
            </Form>
          </form>
        )}
      </Drawer>

      <Modal
        open={confirmClose}
        onOk={handleConfirmClose}
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
    </>
  )
}