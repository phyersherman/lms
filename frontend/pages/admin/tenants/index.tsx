import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '../../../src/components/AdminLayout'
import { AdminTable, TableColumn } from '../../../src/components/AdminTable'
import { useTableData } from '../../../src/hooks/useTableData'
import { useAuth } from '../../../src/auth/AuthProvider'
import api from '../../../src/lib/api'
import styles from '../../../styles/admin-table.module.css'

interface Tenant {
  id: string
  name: string
  domains?: { id: string; host: string; isPrimary: boolean }[]
}

const TenantsPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem('selectedTenantId')
    if (saved) setSelectedTenantId(saved)
  }, [])

  const { data: tenants, loading, deleteItem } = useTableData<Tenant>({
    fetchFn: async () => {
      const data = await api.getTenants()
      if (Array.isArray(data)) {
        return data
      } else if (data && typeof data === 'object') {
        return Array.isArray(data.tenants) ? data.tenants : []
      }
      return []
    },
    onDeleteFn: api.deleteTenant,
    onDeleteSuccess: () => {
      alert('Tenant deleted successfully')
    },
    deps: [user],
  })

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenantId(tenant.id)
    localStorage.setItem('selectedTenantId', tenant.id)
    router.push(`/admin/tenants/${tenant.id}`)
  }

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (
      !confirm(
        'Are you sure you want to delete this tenant? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      await deleteItem(tenant.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tenant')
    }
  }

  if (!user) return <div>Loading...</div>
  if (user.role !== 'admin') return <div>Unauthorized</div>

  const columns: TableColumn<Tenant>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (value) => <strong>{value}</strong>,
    },
    {
      key: 'domains',
      header: 'Domains',
      render: (value) =>
        Array.isArray(value) && value.length > 0
          ? value.map((d: any) => d.host).join(', ')
          : '—',
    },
  ]

  return (
    <AdminLayout title="Tenants">
      <div className={styles.header}>
        <div>
          <p className={styles.subtitle}>
            Manage course portals and white-label instances
          </p>
        </div>
        <Link href="/admin/tenants/new" className={styles.primaryButton}>
          + New Tenant
        </Link>
      </div>

      <AdminTable
        columns={columns}
        data={tenants}
        loading={loading}
        emptyStateText="No tenants yet. Create your first tenant to get started."
        emptyStateAction={
          <Link
            href="/admin/tenants/new"
            className={styles.primaryButton}
            style={{ marginTop: 16, display: 'inline-block' }}
          >
            Create First Tenant
          </Link>
        }
        actions={(tenant) => (
          <>
            <button
              onClick={() => handleViewTenant(tenant)}
              style={{
                border: 'none',
                background: 'none',
                padding: '0 8px 0 0',
                cursor: 'pointer',
              }}
            >
              <span className={styles.secondaryButton}>View</span>
            </button>
            <Link
              href={`/admin/tenants/${tenant.id}/users`}
              style={{
                border: 'none',
                background: 'none',
                padding: '0 8px 0 0',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <span className={styles.secondaryButton}>Users</span>
            </Link>
            <Link
              href={`/admin/tenants/${tenant.id}/email-config`}
              style={{
                border: 'none',
                background: 'none',
                padding: '0 8px 0 0',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <span className={styles.secondaryButton}>Email</span>
            </Link>
            <button
              onClick={() => handleDeleteTenant(tenant)}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span
                className={styles.secondaryButton}
                style={{ color: '#d32f2f' }}
              >
                Delete
              </span>
            </button>
          </>
        )}
      />
    </AdminLayout>
  )
}

export default TenantsPage
