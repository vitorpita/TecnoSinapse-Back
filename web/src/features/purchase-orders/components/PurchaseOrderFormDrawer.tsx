import { useEffect, useState } from 'react'
import {
  Drawer, Form, Select, Button, InputNumber, Input,
  Divider, Tag, Space, Spin, Modal, DatePicker, Row, Col,
} from 'antd'
import { MoneyInput } from '@/components/MoneyInput'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  purchaseOrderService,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
  type SupplierOption,
  type ProductOption,
} from '../../purchase-orders/purchaseOrderService'
import styles from './PurchaseOrderFormDrawer.module.css'

const schema = z.object({
  supplierId:    z.number({ required_error: 'Selecione o fornecedor' }),
  status:        z.enum(['PENDENTE', 'CONFIRMADO', 'RECEBIDO', 'CANCELADO']),
  invoiceNumber: z.string().optional(),
  expectedAt:    z.string().optional(),
  freightCost:   z.number().min(0).optional(),
  discount:      z.number().min(0).optional(),
  notes:         z.string().optional(),
  items: z.array(z.object({
    productId: z.number({ required_error: 'Selecione o produto' }),
    quantity:  z.number().positive('Quantidade deve ser maior que 0'),
    unitCost:  z.number().positive('Custo deve ser maior que 0'),
  })).min(1, 'Adicione pelo menos um produto'),
})

type FormValues = z.infer<typeof schema>

const statusOptions = [
  { value: 'PENDENTE',   label: 'Pendente'   },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'RECEBIDO',   label: 'Recebido'   },
  { value: 'CANCELADO',  label: 'Cancelado'  },
]

interface Props {
  open:        boolean
  order:       PurchaseOrderRecord | null
  onClose:     () => void
  onSuccess:   () => void
  saving:      boolean
  onSubmit:    (values: FormValues) => void
}

export default function PurchaseOrderFormDrawer({ open, order, onClose, onSuccess, saving, onSubmit }: Props) {
  const isEdit = !!order
  const [confirmClose, setConfirmClose] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')

  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['purchase-suppliers'],
    queryFn:  purchaseOrderService.getSuppliers,
    staleTime: 1000 * 60 * 5,
  })

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['purchase-products'],
    queryFn:  purchaseOrderService.getProducts,
    staleTime: 1000 * 60 * 5,
  })

  const {
    control, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId:    undefined,
      status:        'PENDENTE',
      invoiceNumber: '',
      expectedAt:    '',
      freightCost:   0,
      discount:      0,
      notes:         '',
      items: [{ productId: undefined as unknown as number, quantity: 1, unitCost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (order) {
      reset({
        supplierId:    order.supplierId,
        status:        order.status,
        invoiceNumber: order.invoiceNumber ?? '',
        expectedAt:    order.expectedAt ?? '',
        freightCost:   Number(order.freightCost ?? 0),
        discount:      Number(order.discount ?? 0),
        notes:         order.notes ?? '',
        items: order.items.map(i => ({
          productId: i.productId,
          quantity:  Number(i.quantity),
          unitCost:  Number(i.unitCost),
        })),
      })
    } else {
      reset({
        supplierId: undefined, status: 'PENDENTE',
        invoiceNumber: '', expectedAt: '',
        freightCost: 0, discount: 0, notes: '',
        items: [{ productId: undefined as unknown as number, quantity: 1, unitCost: 0 }],
      })
    }
  }, [order, reset, open])

  const items      = watch('items')
  const freight    = watch('freightCost') ?? 0
  const discount   = watch('discount') ?? 0
  const subtotal   = items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.unitCost ?? 0), 0)
  const total      = Math.max(0, subtotal + Number(freight) - Number(discount))
  const products   = productsData?.content ?? []

  // Filtra fornecedores pela busca (nome, razão social, CNPJ)
  const allSuppliers = suppliersData?.content ?? []
  const suppliers = supplierSearch
    ? allSuppliers.filter(s =>
        s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.document?.includes(supplierSearch.replace(/\D/g, '')) ||
        (s as SupplierOption & { fantasyName?: string }).fantasyName?.toLowerCase().includes(supplierSearch.toLowerCase())
      )
    : allSuppliers

  const handleProductChange = (productId: number, index: number) => {
    const product = products.find((p: ProductOption) => p.id === productId)
    if (product?.unitCost) {
      setValue(`items.${index}.unitCost`, Number(product.unitCost))
    }
  }

  const handleCloseRequest = () => setConfirmClose(true)
  const handleConfirmClose = () => { setConfirmClose(false); onClose() }

  const loading = loadingSuppliers || loadingProducts

  return (
    <>
      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span>{isEdit ? `Editando Compra #${order?.id}` : 'Nova Ordem de Compra'}</span>
            {isEdit && <Tag color="blue">{order?.status}</Tag>}
          </div>
        }
        open={open}
        onClose={handleCloseRequest}
        width={820}
        maskClosable={false}
        keyboard={false}
        footer={
          <div className={styles.drawerFooter}>
            <div className={styles.totalsFooter}>
              <div className={styles.totalItem}>
                <span>Subtotal</span>
                <strong>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className={styles.totalItem}>
                <span>Frete</span>
                <strong>+ R$ {Number(freight).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className={styles.totalItem}>
                <span>Desconto</span>
                <strong className={styles.discountValue}>- R$ {Number(discount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className={`${styles.totalItem} ${styles.totalFinal}`}>
                <span>Total</span>
                <strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
            <Space>
              <Button onClick={handleCloseRequest} disabled={saving}>Cancelar</Button>
              <Button type="primary" loading={saving} onClick={handleSubmit(onSubmit)} className={styles.saveBtn}>
                {isEdit ? 'Salvar alterações' : 'Criar ordem'}
              </Button>
            </Space>
          </div>
        }
      >
        {loading ? (
          <div className={styles.loadingWrap}><Spin /></div>
        ) : (
          <form noValidate>
            <Form layout="vertical" component={false}>

              {/* ── Dados gerais ── */}
              <div className={styles.sectionTitle}>Dados Gerais</div>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    label={<span className={styles.fieldLabel}>Fornecedor</span>}
                    validateStatus={errors.supplierId ? 'error' : ''}
                    help={errors.supplierId?.message}
                  >
                    <Controller
                      name="supplierId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          showSearch
                          placeholder="Buscar por nome, razão social ou CNPJ..."
                          filterOption={false}
                          onSearch={setSupplierSearch}
                          onChange={(val) => { field.onChange(val); setSupplierSearch('') }}
                          size="large"
                          options={suppliers.map((s: SupplierOption) => ({
                            value: s.id,
                            label: s.name,
                            title: s.document,
                          }))}
                          optionRender={(opt) => (
                            <div className={styles.supplierOption}>
                              <span className={styles.supplierName}>{opt.label}</span>
                              {opt.data.title && (
                                <span className={styles.supplierDoc}>{opt.data.title}</span>
                              )}
                            </div>
                          )}
                          notFoundContent={loadingSuppliers ? <Spin size="small" /> : 'Nenhum fornecedor encontrado'}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={<span className={styles.fieldLabel}>Status</span>}>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} options={statusOptions} size="large" />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label={<span className={styles.fieldLabel}>Nº da Nota Fiscal</span>}>
                    <Controller
                      name="invoiceNumber"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} placeholder="Ex: NF-00123" size="large" />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={<span className={styles.fieldLabel}>Previsão de Chegada</span>}>
                    <Controller
                      name="expectedAt"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                          format="DD/MM/YYYY"
                          size="large"
                          style={{ width: '100%' }}
                          placeholder="Selecione a data"
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={<span className={styles.fieldLabel}>Frete (R$)</span>}>
                    <Controller
                      name="freightCost"
                      control={control}
                      render={({ field }) => (
                        <MoneyInput {...field} style={{ width: '100%' }} size="large" />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label={<span className={styles.fieldLabel}>Desconto (R$)</span>}>
                    <Controller
                      name="discount"
                      control={control}
                      render={({ field }) => (
                        <MoneyInput {...field} style={{ width: '100%' }} size="large" />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item label={<span className={styles.fieldLabel}>Observações</span>}>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <Input {...field} placeholder="Condições de pagamento, prazo, etc." size="large" />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* ── Itens ── */}
              <Divider className={styles.divider}>Produtos</Divider>

              {fields.map((field, index) => (
                <div key={field.id} className={styles.itemRow}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIndex}>Item {index + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" className={styles.removeBtn} onClick={() => remove(index)}>
                        <DeleteOutlined /> Remover
                      </button>
                    )}
                  </div>

                  <Row gutter={12} align="bottom">
                    <Col span={12}>
                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Produto</span>}
                        validateStatus={errors.items?.[index]?.productId ? 'error' : ''}
                        help={errors.items?.[index]?.productId?.message}
                        style={{ marginBottom: 0 }}
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
                              onChange={(val) => { f.onChange(val); handleProductChange(val, index) }}
                              options={products.map((p: ProductOption) => ({
                                value: p.id,
                                label: `${p.name}${p.sku ? ` — ${p.sku}` : ''}`,
                              }))}
                            />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Quantidade</span>}
                        validateStatus={errors.items?.[index]?.quantity ? 'error' : ''}
                        style={{ marginBottom: 0 }}
                      >
                        <Controller
                          name={`items.${index}.quantity`}
                          control={control}
                          render={({ field: f }) => (
                            <InputNumber {...f} min={0.01} step={0.5} precision={2} style={{ width: '100%' }} size="large" />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Custo Unit.</span>}
                        validateStatus={errors.items?.[index]?.unitCost ? 'error' : ''}
                        style={{ marginBottom: 0 }}
                      >
                        <Controller
                          name={`items.${index}.unitCost`}
                          control={control}
                          render={({ field: f }) => (
                            <MoneyInput {...f} min={0.01} style={{ width: '100%' }} size="large" />
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <div className={styles.itemSubtotal}>
                        <span className={styles.fieldLabelSm}>Total</span>
                        <div className={styles.subtotalValue}>
                          R$ {((items[index]?.quantity ?? 0) * (items[index]?.unitCost ?? 0))
                            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              ))}

              <button
                type="button"
                className={styles.addItemBtn}
                onClick={() => append({ productId: undefined as unknown as number, quantity: 1, unitCost: 0 })}
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