import { Drawer, Tag, Spin, Divider } from 'antd'
import type { OrderResponse } from '../types/order.types'
import { statusConfig } from '../utils/orderUtils'
import styles from './OrderDetailDrawer.module.css'

interface Props {
  open:    boolean
  order:   OrderResponse | null
  onClose: () => void
}

export default function OrderDetailDrawer({ open, order, onClose }: Props) {
  if (!order) return null
  const status = statusConfig[order.status]

  return (
    <Drawer
      title={
        <div className={styles.drawerTitle}>
          <span>Pedido #{order.id}</span>
          <Tag color={status.antColor}>{status.label}</Tag>
        </div>
      }
      open={open}
      onClose={onClose}
      width={520}
    >
      {/* Info geral */}
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Cliente</span>
          <span className={styles.infoValue}>{order.clientName}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Vendedor</span>
          <span className={styles.infoValue}>{order.sellerName}</span>
        </div>
        {order.createdAt && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Data do Pedido</span>
            <span className={styles.infoValue}>
              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        )}
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Status</span>
          <Tag color={status.antColor}>{status.label}</Tag>
        </div>
      </div>

      <Divider className={styles.divider}>Produtos</Divider>

      {/* Itens */}
      <div className={styles.itemsList}>
        {order.items.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{item.productName}</span>
              <span className={styles.itemQty}>
                {Number(item.quantity).toLocaleString('pt-BR')} ×{' '}
                R$ {Number(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className={styles.itemSubtotal}>
              R$ {Number(item.subTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      <Divider />

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Total do Pedido</span>
        <span className={styles.totalValue}>
          R$ {Number(order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </Drawer>
  )
}