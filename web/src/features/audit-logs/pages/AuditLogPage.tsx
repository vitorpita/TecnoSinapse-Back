import { useState } from 'react'
import { Select, Spin, Tag, Empty, Tooltip } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  auditLogService, MODULE_LABELS, ACTION_LABELS, ACTION_COLORS,
  type AuditModule, type AuditLogRecord,
} from '../auditLogService'
import styles from './AuditLogPage.module.css'

const moduleOptions = [
  { value: '',               label: 'Todos os módulos' },
  ...Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label })),
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AuditLogPage() {
  const [moduleFilter, setModuleFilter] = useState<AuditModule | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', moduleFilter, page],
    queryFn: () => moduleFilter
      ? auditLogService.findByModule(moduleFilter, page, 50)
      : auditLogService.findAll(page, 50),
    staleTime: 0,
  })

  const logs: AuditLogRecord[] = data?.content ?? []

  const handleModuleChange = (v: string) => {
    setModuleFilter(v as AuditModule | '')
    setPage(0)
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Select
          value={moduleFilter}
          onChange={handleModuleChange}
          options={moduleOptions}
          style={{ width: 220 }}
          size="large"
          placeholder="Filtrar por módulo"
        />
        <span className={styles.count}>
          {isLoading ? '...' : `${data?.totalElements ?? 0} registro${(data?.totalElements ?? 0) !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>
            Logs de Auditoria{moduleFilter ? ` — ${MODULE_LABELS[moduleFilter as AuditModule]}` : ''}
          </span>
        </div>

        {isLoading ? (
          <div className={styles.centerState}><Spin size="large" /></div>
        ) : logs.length === 0 ? (
          <div className={styles.centerState}><Empty description="Nenhum log registrado" /></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Módulo</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.tdDate}>{formatDate(log.timestamp)}</td>
                  <td className={styles.tdUser}>
                    {log.userName ?? <span className={styles.empty}>—</span>}
                    {log.userId && <span className={styles.userId}>#{log.userId}</span>}
                  </td>
                  <td>
                    <span className={styles.moduleTag}>{MODULE_LABELS[log.module]}</span>
                  </td>
                  <td>
                    <Tag color={ACTION_COLORS[log.action]}>{ACTION_LABELS[log.action]}</Tag>
                  </td>
                  <td className={styles.tdEntity}>
                    {log.entityName
                      ? <>{log.entityName}{log.entityId && <span className={styles.entityId}> #{log.entityId}</span>}</>
                      : <span className={styles.empty}>—</span>}
                  </td>
                  <td className={styles.tdDetails}>
                    {log.details
                      ? <Tooltip title={log.details}><span className={styles.detailsText}>{log.details}</span></Tooltip>
                      : <span className={styles.empty}>—</span>}
                  </td>
                </tr>
              ))}
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
    </div>
  )
}
