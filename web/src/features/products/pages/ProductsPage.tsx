import { useState, useEffect } from 'react'
import { App, Button, Select, Tag, Tooltip, Popconfirm, Pagination, Empty, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { productService, type ProductRecord } from '../productService'
import styles from './ProductsPage.module.css'

function formatCurrency(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

export default function ProductsPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [page,    setPage]    = useState(0)
  const [search,  setSearch]  = useState('')
  const [view,    setView]    = useState<'table' | 'grid'>('table')

  useEffect(() => {
    const check = () => { if (window.innerWidth <= 768) setView('grid') }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', page, search],
    queryFn:  () => productService.list(page, 20, search || undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      message.success('Produto inativado.')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      message.error(msg || 'Erro ao inativar produto.')
    },
  })

  const products = data?.content ?? []

  // Totalizadores rápidos
  const totalProdutos = data?.totalElements ?? 0
  const totalEstoque  = products.reduce((a, p) => a + Number(p.stockQuantity), 0)
  const valorEstoque  = products.reduce((a, p) => a + Number(p.stockQuantity) * Number(p.purchasePrice), 0)
  const semEstoque    = products.filter(p => Number(p.stockQuantity) <= 0).length

  return (
    <div className={styles.root}>

      {/* ── Cards de resumo ───────────────────────── */}
      <div className={styles.cards}>
        {[
          { label: 'Total de Produtos',  value: String(totalProdutos),          accent: '#042C53' },
          { label: 'Total em Estoque',   value: totalEstoque.toLocaleString('pt-BR') + ' un.', accent: '#378ADD' },
          { label: 'Valor do Estoque',   value: formatCurrency(valorEstoque),   accent: '#1D9E75' },
          { label: 'Sem Estoque',        value: String(semEstoque) + ' produto' + (semEstoque !== 1 ? 's' : ''), accent: '#E24B4A' },
        ].map(card => (
          <div key={card.label} className={styles.card} style={{ borderTopColor: card.accent }}>
            <span className={styles.cardLabel}>{card.label}</span>
            <span className={styles.cardValue}>{isLoading ? '...' : card.value}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <SearchOutlined className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar produto, SKU ou categoria..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'table' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('table')}
            >☰ Lista</button>
            <button
              className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('grid')}
            >⊞ Grade</button>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate('/products/new')}
          className={styles.newBtn}
        >
          Novo Produto
        </Button>
      </div>

      {/* ── Conteúdo ─────────────────────────────── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Produtos</span>
          <span className={styles.tableCount}>
            {isLoading ? '...' : `${data?.totalElements ?? 0} produtos`}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : isError ? (
          <div className={styles.centerState}><span className={styles.errorText}>Erro ao carregar produtos.</span></div>
        ) : products.length === 0 ? (
          <div className={styles.centerState}><Empty description="Nenhum produto encontrado" /></div>
        ) : view === 'grid' ? (
          /* ── Grade de cards ── */
          <div className={styles.grid}>
            {products.map((p: ProductRecord) => (
              <div key={p.id} className={styles.productCard}>
                <div className={styles.productImg}>
                  {p.imgUrl ? (
                    <img src={p.imgUrl} alt={p.name} className={styles.productImgEl} />
                  ) : (
                    <div className={styles.productImgPlaceholder}>
                      <span>📦</span>
                    </div>
                  )}
                  {Number(p.stockQuantity) <= 0 && (
                    <div className={styles.outOfStock}>Sem estoque</div>
                  )}
                </div>
                <div className={styles.productCardBody}>
                  <div className={styles.productCardName}>{p.name}</div>
                  {p.sku && <div className={styles.productCardSku}>{p.sku}</div>}
                  {p.categoryName && <Tag style={{ marginTop: 4 }}>{p.categoryName}</Tag>}
                  <div className={styles.productCardPrices}>
                    <div>
                      <span className={styles.priceLabel}>Venda</span>
                      <span className={styles.priceValue}>{formatCurrency(Number(p.unitPrice))}</span>
                    </div>
                    <div>
                      <span className={styles.priceLabel}>Custo</span>
                      <span className={styles.priceCost}>{formatCurrency(Number(p.purchasePrice))}</span>
                    </div>
                  </div>
                  <div className={styles.productCardStock}>
                    Estoque: <strong>{Number(p.stockQuantity).toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
                <div className={styles.productCardActions}>
                  <button className={styles.cardActionBtn} onClick={() => navigate(`/products/${p.id}`)}>
                    <EditOutlined /> Editar
                  </button>
                  <Popconfirm
                    title="Inativar produto?"
                    onConfirm={() => deleteMutation.mutate(p.id)}
                    okText="Sim" cancelText="Não" okButtonProps={{ danger: true }}
                  >
                    <button className={`${styles.cardActionBtn} ${styles.cardActionDanger}`}>
                      <DeleteOutlined /> Inativar
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Tabela ── */
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nome / SKU</th>
                <th>Categoria</th>
                <th>Cor</th>
                <th>Estoque</th>
                <th>Preço Venda</th>
                <th>Custo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: ProductRecord) => (
                <tr key={p.id}>
                  <td className={styles.tdImg}>
                    {p.imgUrl ? (
                      <img src={p.imgUrl} alt={p.name} className={styles.tableImg} />
                    ) : (
                      <div className={styles.tableImgPlaceholder}>📦</div>
                    )}
                  </td>
                  <td>
                    <div className={styles.tdName}>{p.name}</div>
                    {p.sku && <div className={styles.tdSku}>{p.sku}</div>}
                  </td>
                  <td className={styles.tdCategory}>
                    {p.categoryName ? <Tag>{p.categoryName}</Tag> : <span className={styles.empty}>—</span>}
                  </td>
                  <td className={styles.tdColor}>
                    {p.color ? (
                      <div className={styles.colorCell}>
                        <div className={styles.colorDot} style={{ background: p.color.startsWith('#') ? p.color : '#ddd' }} />
                        {p.color}
                      </div>
                    ) : <span className={styles.empty}>—</span>}
                  </td>
                  <td>
                    <span className={Number(p.stockQuantity) <= 0 ? styles.stockEmpty : styles.stockOk}>
                      {Number(p.stockQuantity).toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className={styles.tdPrice}>{formatCurrency(Number(p.unitPrice))}</td>
                  <td className={styles.tdCost}>{formatCurrency(Number(p.purchasePrice))}</td>
                  <td>
                    <div className={styles.actions}>
                      <Tooltip title="Editar">
                        <button className={styles.actionBtn} onClick={() => navigate(`/products/${p.id}`)}>
                          <EditOutlined />
                        </button>
                      </Tooltip>
                      <Popconfirm
                        title="Inativar produto"
                        description="O produto será inativado no sistema."
                        onConfirm={() => deleteMutation.mutate(p.id)}
                        okText="Sim, inativar" cancelText="Cancelar" okButtonProps={{ danger: true }}
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
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && (data?.totalPages ?? 0) > 1 && (
          <div className={styles.pagination}>
            <Pagination
              current={(data?.number ?? 0) + 1}
              total={data?.totalElements ?? 0}
              pageSize={data?.size ?? 20}
              onChange={(p) => setPage(p - 1)}
              showSizeChanger={false}
              showTotal={(t) => `Total: ${t} produtos`}
            />
          </div>
        )}
      </div>
    </div>
  )
}