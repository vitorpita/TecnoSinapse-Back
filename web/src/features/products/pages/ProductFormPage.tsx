import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Button, Form, Input, InputNumber, Select, Spin, Row, Col } from 'antd'
import { MoneyInput } from '@/components/MoneyInput'
import { ArrowLeftOutlined, SaveOutlined, CloudUploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productService, type CreateProductRequest } from '../productService'
import styles from './ProductFormPage.module.css'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string

interface HttpError extends Error {
  response?: {
    data?: {
      message?: string
    }
  }
}

interface ProductFormValues {
  name: string
  sku?: string
  color?: string
  composition?: string
  weightGsm?: number
  width?: number
  stockQuantity: number
  unitPrice: number
  purchasePrice: number
  _marginPct?: number
  categoryId?: number
  providerId?: number
}

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [form] = Form.useForm<ProductFormValues>()
  const [imgUrl, setImgUrl] = useState('')
  const [imgPreview, setImgPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.findById(Number(id)),
    enabled: isEdit,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: productService.getCategories,
    staleTime: 0,
  })

  const { data: providersData } = useQuery({
    queryKey: ['product-providers'],
    queryFn: productService.getProviders,
    staleTime: 1000 * 60 * 5,
  })

  const { data: nextSku } = useQuery({
    queryKey: ['product-next-sku'],
    queryFn: productService.getNextSku,
    enabled: !isEdit,
    staleTime: 0,
  })

  useEffect(() => {
    if (!isEdit && nextSku) {
      form.setFieldValue('sku', nextSku)
    }
  }, [nextSku, isEdit, form])

  useEffect(() => {
    if (product) {
      const sale = Number(product.unitPrice)
      const cost = Number(product.purchasePrice)
      const marginPct = cost > 0 ? parseFloat(((sale / cost - 1) * 100).toFixed(2)) : 0
      form.setFieldsValue({
        name: product.name,
        sku: product.sku,
        color: product.color,
        composition: product.composition,
        weightGsm: product.weightGsm,
        width: product.width,
        stockQuantity: Number(product.stockQuantity),
        unitPrice: sale,
        purchasePrice: cost,
        _marginPct: marginPct,
        categoryId: product.categoryId,
        providerId: product.providerId,
      })
      if (product.imgUrl) {
        setImgUrl(product.imgUrl)
        setImgPreview(product.imgUrl)
      }
    }
  }, [product, form])

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) => productService.create(payload),
    onSuccess: () => {
      message.success('Produto criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['products'] })
      navigate('/products')
    },
    onError: (err: unknown) => {
      const msg = (err as HttpError)?.response?.data?.message
      message.error(msg || 'Erro ao criar produto.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) => productService.update(Number(id), payload),
    onSuccess: () => {
      message.success('Produto atualizado!')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      navigate('/products')
    },
    onError: (err: unknown) => {
      const msg = (err as HttpError)?.response?.data?.message
      message.error(msg || 'Erro ao atualizar produto.')
    },
  })

  const saving = createMutation.isPending || updateMutation.isPending

  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        resolve(img.width >= 300 && img.height >= 300)
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        resolve(false)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      message.error('Use JPG, PNG ou WEBP')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      message.error(`Máximo 5MB (seu arquivo: ${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      return
    }

    const hasValidDimensions = await validateImageDimensions(file)
    if (!hasValidDimensions) {
      message.warning('Imagem muito pequena (mínimo 300x300px) ou inválida')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setImgPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      setUploading(true)
      const url = await productService.uploadImage(file, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET)
      setImgUrl(url)
      setImgPreview(url)
      message.success('Imagem enviada com sucesso!')
    } catch {
      message.error('Erro ao enviar imagem. Verifique as configurações do Cloudinary.')
      setImgPreview('')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  const onFinish = (values: ProductFormValues) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sku: _sku, _marginPct: _m, ...rest } = values
    const base: CreateProductRequest = isEdit ? {
      name: values.name, sku: values.sku, color: values.color,
      composition: values.composition, weightGsm: values.weightGsm, width: values.width,
      stockQuantity: values.stockQuantity, unitPrice: values.unitPrice,
      purchasePrice: values.purchasePrice, categoryId: values.categoryId, providerId: values.providerId,
    } : rest
    const payload: CreateProductRequest = {
      ...base,
      imgUrl: imgUrl || undefined,
    }

    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const categories = useMemo(() => {
    const list = categoriesData?.content ?? []
    if (!product?.categoryId) return list
    if (list.some(c => c.id === product.categoryId)) return list
    return [{ id: product.categoryId, name: product.categoryName ?? `Categoria #${product.categoryId}` }, ...list]
  }, [categoriesData, product])

  const providers = useMemo(() => {
    const list = providersData?.content ?? []
    if (!product?.providerId) return list
    if (list.some(p => p.id === product.providerId)) return list
    return [{ id: product.providerId, name: product.providerName ?? `Fornecedor #${product.providerId}` }, ...list]
  }, [providersData, product])

  const fieldLabel = (text: string) => <span className={styles.fieldLabel}>{text}</span>

  if (isEdit && loadingProduct) {
    return <div className={styles.loadingPage}><Spin size="large" /></div>
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/products')}>
          <ArrowLeftOutlined /> Voltar para produtos
        </button>
        <div className={styles.pageHeaderRight}>
          <h1 className={styles.pageTitle}>
            {isEdit ? `Editando: ${product?.name ?? '...'}` : 'Novo Produto'}
          </h1>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark
        scrollToFirstError
        onFinishFailed={({ errorFields }) => {
          const first = errorFields[0]?.errors[0]
          if (first) message.error(`Campo obrigatório: ${first}`)
        }}
      >
        <div className={styles.layout}>
          <div className={styles.mainCol}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Informações Básicas</div>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="name" label={fieldLabel('Nome do Produto')} rules={[{ required: true, message: 'Informe o nome do produto' }]}>
                    <Input placeholder="Ex: Tecido Oxford Lisa" size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="sku" label={fieldLabel('SKU / Código')}>
                    <Input
                      size="large"
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="categoryId" label={fieldLabel('Categoria')} rules={[{ required: true, message: 'Selecione a categoria' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Selecione a categoria"
                      size="large"
                      allowClear
                      options={categories.map(c => ({
                      value: c.id,
                      label: c.name,
                      desc:  c.description,
                    }))}
                    optionRender={(opt) => (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.data.label}</div>
                        {opt.data.desc && (
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{opt.data.desc}</div>
                        )}
                      </div>
                    )}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="providerId" label={fieldLabel('Fornecedor')} rules={[{ required: true, message: 'Selecione o fornecedor' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Selecione o fornecedor"
                      size="large"
                      allowClear
                      options={providers.map(p => ({ value: p.id, label: p.name }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Características do Tecido</div>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="color" label={fieldLabel('Cor')}>
                    <Input placeholder="Ex: Branco, Azul Marinho" size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="weightGsm" label={fieldLabel('Gramatura (g/m²)')}>
                    <InputNumber placeholder="Ex: 150" min={0} style={{ width: '100%' }} size="large" suffix="g/m²" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="width" label={fieldLabel('Largura (m)')}>
                    <InputNumber placeholder="Ex: 1.50" min={0} step={0.01} precision={2} style={{ width: '100%' }} size="large" suffix="m" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="composition" label={fieldLabel('Composição')}>
                <Input placeholder="Ex: 100% Algodão, 65% Poliéster 35% Algodão" size="large" />
              </Form.Item>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Preços e Estoque</div>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="purchasePrice" label={fieldLabel('Preço de Custo (R$)')} rules={[{ required: true, message: 'Informe o preço de custo' }]}>
                    <MoneyInput
                      style={{ width: '100%' }}
                      size="large"
                      placeholder="0,00"
                      onChange={(val) => {
                        const cost = Number(val) || 0
                        const margin = form.getFieldValue('_marginPct') ?? 0
                        if (margin > 0 && cost > 0) {
                          form.setFieldValue('unitPrice', parseFloat((cost * (1 + margin / 100)).toFixed(2)))
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="_marginPct"
                    label={fieldLabel('Margem de Lucro (%)')}
                    extra={<span style={{ fontSize: 11, color: '#888' }}>Preencha para calcular a venda automaticamente</span>}
                  >
                    <InputNumber<number>
                      min={0}
                      max={999.99}
                      step={0.5}
                      precision={2}
                      decimalSeparator=","
                      formatter={(v) => String(v ?? '').replace('.', ',')}
                      parser={(v) => parseFloat((v ?? '').replace(',', '.')) || 0}
                      style={{ width: '100%' }}
                      size="large"
                      placeholder="Ex: 30"
                      suffix="%"
                      onChange={(val) => {
                        const margin = val != null ? Number(val) : null
                        const cost = form.getFieldValue('purchasePrice') ?? 0
                        if (margin != null && margin > 0 && cost > 0) {
                          form.setFieldValue('unitPrice', parseFloat((cost * (1 + margin / 100)).toFixed(2)))
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev._marginPct !== curr._marginPct}
                  >
                    {({ getFieldValue }) => {
                      const hasMargin = (getFieldValue('_marginPct') ?? 0) > 0
                      return (
                        <Form.Item
                          name="unitPrice"
                          label={fieldLabel('Preço de Venda (R$)')}
                          rules={[{ required: true, message: 'Informe o preço de venda' }]}
                          extra={hasMargin
                            ? <span style={{ fontSize: 11, color: '#1D9E75' }}>Calculado pela margem — limpe a margem para editar</span>
                            : <span style={{ fontSize: 11, color: '#888' }}>Digite o valor diretamente</span>
                          }
                        >
                          <MoneyInput
                            style={{ width: '100%' }}
                            size="large"
                            placeholder="0,00"
                            disabled={hasMargin}
                          />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="stockQuantity" label={fieldLabel('Estoque (metros/unidades)')} rules={[{ required: true, message: 'Informe o estoque' }]}>
                    <InputNumber<number>
                      min={0} step={0.5} precision={2}
                      decimalSeparator=","
                      formatter={(v) => {
                        const [int, dec] = String(v ?? '').split('.')
                        const t = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                        return dec !== undefined ? `${t},${dec}` : t
                      }}
                      parser={(v) => parseFloat((v ?? '').replace(/\./g, '').replace(',', '.')) || 0}
                      style={{ width: '100%' }} size="large" placeholder="0"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.unitPrice !== curr.unitPrice || prev.purchasePrice !== curr.purchasePrice}>
                {({ getFieldValue }) => {
                  const sale = getFieldValue('unitPrice') ?? 0
                  const cost = getFieldValue('purchasePrice') ?? 0
                  const marginOnSale = sale > 0 ? ((sale - cost) / sale * 100) : 0
                  const profit = sale - cost
                  return (
                    <div className={styles.marginBar}>
                      <div className={styles.marginItem}>
                        <span className={styles.marginLabel}>Lucro por unidade</span>
                        <span className={`${styles.marginValue} ${profit >= 0 ? styles.positive : styles.negative}`}>
                          R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className={styles.marginItem}>
                        <span className={styles.marginLabel}>Margem sobre venda</span>
                        <span className={`${styles.marginValue} ${marginOnSale >= 0 ? styles.positive : styles.negative}`}>
                          {marginOnSale.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                }}
              </Form.Item>
            </div>
          </div>

          <div className={styles.sideCol}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Foto do Produto</div>

              <div
                className={`${styles.dropZone} ${uploading ? styles.dropZoneUploading : ''}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {uploading ? (
                  <div className={styles.dropZoneContent}>
                    <Spin />
                    <span className={styles.dropZoneText}>Enviando imagem...</span>
                  </div>
                ) : imgPreview ? (
                  <img src={imgPreview} alt="Preview" className={styles.imgPreview} />
                ) : (
                  <div className={styles.dropZoneContent}>
                    <CloudUploadOutlined className={styles.dropZoneIcon} />
                    <span className={styles.dropZoneText}>Clique ou arraste a imagem aqui</span>
                    <span className={styles.dropZoneHint}>JPG, PNG ou WEBP — máx. 5MB</span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageFile(file)
                }}
              />

              {imgPreview && !uploading && (
                <button type="button" className={styles.removeImgBtn} onClick={() => { setImgUrl(''); setImgPreview('') }}>
                  Remover imagem
                </button>
              )}
            </div>

            <div className={styles.actionsBox}>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block size="large" className={styles.saveBtn}>
                {isEdit ? 'Salvar alterações' : 'Criar produto'}
              </Button>
              <Button block size="large" onClick={() => navigate('/products')} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  )
}