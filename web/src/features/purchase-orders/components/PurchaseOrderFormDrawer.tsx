import { useEffect, useState } from 'react'
import { Drawer, Form, Select, Button, InputNumber, Input, Divider, Tag, Space, Spin, Modal, DatePicker, Row, Col } from 'antd'
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
  type SupplierOption,
  type ProductOption,
} from '../../purchase-orders/purchaseOrderService'
import styles from './PurchaseOrderFormDrawer.module.css'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'DINHEIRO',       label: 'Dinheiro'          },
  { value: 'PIX',            label: 'Pix'               },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO',  label: 'Cartão de Débito'  },
  { value: 'BOLETO',         label: 'Boleto'            },
  { value: 'TRANSFERENCIA',  label: 'Transferência'     },
  { value: 'CHEQUE',         label: 'Cheque'            },
]

const PAYMENT_CONDITION_OPTIONS = [
  { value: 'À vista',   label: 'À vista'   },
  { value: '30',        label: '30 dias'   },
  { value: '30/60',     label: '30/60'     },
  { value: '30/60/90',  label: '30/60/90'  },
  { value: '45/90',     label: '45/90'     },
  { value: '60/90/120', label: '60/90/120' },
]

const schema = z.object({
  supplierId:           z.number({ required_error: 'Selecione o fornecedor' }),
  expectedDeliveryDate: z.string().optional(),
  paymentMethod:        z.string().optional(),
  paymentCondition:     z.string().min(1, 'Informe a condição de pagamento'),
  freightType:          z.enum(['CIF', 'FOB', 'OUTRO']).optional(),
  freightCost:          z.number().min(0).optional(),
  discount:             z.number().min(0).optional(),
  observation:          z.string().optional(),
  items: z.array(z.object({
    productId: z.number({ required_error: 'Selecione o produto' }),
    quantity:  z.number({ required_error: 'Informe a quantidade' }).positive('Quantidade deve ser maior que 0'),
    unitCost:  z.number({ required_error: 'Informe o custo' }).positive('Custo deve ser maior que 0'),
  })).min(1, 'Adicione pelo menos um produto'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open:      boolean
  order:     PurchaseOrderRecord | null
  onClose:   () => void
  onSuccess: () => void
  saving:    boolean
  onSubmit:  (values: FormValues) => void
}

function drawerWidth() {
  if (typeof window === 'undefined') return 820
  return window.innerWidth <= 768 ? window.innerWidth : Math.min(820, window.innerWidth - 40)
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
      supplierId:           undefined,
      expectedDeliveryDate: '',
      paymentMethod:        undefined,
      paymentCondition:     '',
      freightType:          undefined,
      freightCost:          0,
      discount:             0,
      observation:          '',
      items: [{ productId: undefined as unknown as number, quantity: 1, unitCost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (order) {
      reset({
        supplierId:           order.supplierId,
        expectedDeliveryDate: order.expectedDeliveryDate ?? '',
        paymentMethod:        (order as { paymentMethod?: string }).paymentMethod ?? undefined,
        paymentCondition:     order.paymentCondition ?? '',
        freightType:          order.freightType ?? undefined,
        freightCost:          0,
        discount:             0,
        observation:          order.observation ?? '',
        items: order.items.map(i => ({
          productId: i.productId,
          quantity:  Number(i.quantity),
          unitCost:  Number(i.unitCost),
        })),
      })
    } else {
      reset({
        supplierId:           undefined,
        expectedDeliveryDate: '',
        paymentMethod:        undefined,
        paymentCondition:     '',
        freightType:          undefined,
        freightCost:          0,
        discount:             0,
        observation:          '',
        items: [{ productId: undefined as unknown as number, quantity: 1, unitCost: 0 }],
      })
    }
  }, [order, reset, open])

  const items    = watch('items')
  const freight  = watch('freightCost') ?? 0
  const discount = watch('discount') ?? 0
  const subtotal = items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.unitCost ?? 0), 0)
  const total    = Math.max(0, subtotal + Number(freight) - Number(discount))
  const products = productsData?.content ?? []

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
    if (product?.unitCost) setValue(`items.${index}.unitCost`, Number(product.unitCost))
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
        width={drawerWidth()}
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

              <div className={styles.sectionTitle}>Dados Gerais</div>

              {/* Fornecedor */}
              <Form.Item
                label={<span className={styles.fieldLabel}>Fornecedor</span>}
                required
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
                          {opt.data.title && <span className={styles.supplierDoc}>{opt.data.title}</span>}
                        </div>
                      )}
                      notFoundContent={loadingSuppliers ? <Spin size="small" /> : 'Nenhum fornecedor encontrado'}
                    />
                  )}
                />
              </Form.Item>

              {/* Forma de Pagamento + Condição de Pagamento */}
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label={<span className={styles.fieldLabel}>Forma de Pagamento</span>}>
                    <Controller
                      name="paymentMethod"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          allowClear
                          placeholder="Selecione"
                          size="large"
                          options={PAYMENT_METHOD_OPTIONS}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span className={styles.fieldLabel}>Condição de Pagamento</span>}
                    required
                    validateStatus={errors.paymentCondition ? 'error' : ''}
                    help={errors.paymentCondition?.message}
                  >
                    <Controller
                      name="paymentCondition"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          showSearch
                          allowClear
                          placeholder="Selecione ou digite..."
                          size="large"
                          options={PAYMENT_CONDITION_OPTIONS}
                          onSearch={() => {}}
                          filterOption={false}
                          onInputKeyDown={() => {}}
                          onChange={(val) => field.onChange(val ?? '')}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Tipo de Frete */}
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label={<span className={styles.fieldLabel}>Tipo de Frete</span>}>
                    <Controller
                      name="freightType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          allowClear
                          placeholder="Selecione"
                          size="large"
                          options={[
                            { value: 'CIF', label: 'CIF — Por conta do fornecedor' },
                            { value: 'FOB', label: 'FOB — Por conta do comprador' },
                            { value: 'OUTRO', label: 'Outro' },
                          ]}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Previsão de Chegada + Frete (custo) */}
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label={<span className={styles.fieldLabel}>Previsão de Chegada</span>}>
                    <Controller
                      name="expectedDeliveryDate"
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
                <Col xs={24} sm={12}>
                  <Form.Item label={<span className={styles.fieldLabel}>Valor do Frete (R$)</span>}>
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

              {/* Desconto */}
              <Form.Item label={<span className={styles.fieldLabel}>Desconto (R$)</span>}>
                <Controller
                  name="discount"
                  control={control}
                  render={({ field }) => (
                    <MoneyInput {...field} style={{ width: '100%' }} size="large" />
                  )}
                />
              </Form.Item>

              {/* Observações */}
              <Form.Item label={<span className={styles.fieldLabel}>Observações</span>}>
                <Controller
                  name="observation"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="Condições especiais, prazo de validade dos produtos, etc." size="large" />
                  )}
                />
              </Form.Item>

              {/* Itens */}
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

                  <Form.Item
                    label={<span className={styles.fieldLabelSm}>Produto</span>}
                    required
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
                          onChange={(val) => { f.onChange(val); handleProductChange(val, index) }}
                          options={products.map((p: ProductOption) => ({
                            value: p.id,
                            label: `${p.name}${p.sku ? ` — ${p.sku}` : ''}`,
                          }))}
                        />
                      )}
                    />
                  </Form.Item>

                  <Row gutter={[12, 0]} align="bottom">
                    <Col xs={12} sm={8}>
                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Quantidade</span>}
                        required
                        validateStatus={errors.items?.[index]?.quantity ? 'error' : ''}
                        help={errors.items?.[index]?.quantity?.message}
                        style={{ marginBottom: 0 }}
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
                    </Col>
                    <Col xs={12} sm={8}>
                      <Form.Item
                        label={<span className={styles.fieldLabelSm}>Custo Unit. (R$)</span>}
                        required
                        validateStatus={errors.items?.[index]?.unitCost ? 'error' : ''}
                        help={errors.items?.[index]?.unitCost?.message}
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
                    <Col xs={24} sm={8}>
                      <div className={styles.itemSubtotal}>
                        <span className={styles.fieldLabelSm}>Subtotal</span>
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
