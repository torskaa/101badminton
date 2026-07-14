/**
 * LIFF → Tenant mapping
 * แต่ละสนามจะสร้าง LIFF app ของตัวเอง
 * map LIFF_ID → tenant slug
 */
export function getTenantSlugFromLiffId(liffId: string): string | null {
  try {
    const map = JSON.parse(process.env.LIFF_TENANT_MAP || '{}')
    return map[liffId] || null
  } catch {
    return null
  }
}

export function getLiffIdFromTenantSlug(slug: string): string | null {
  try {
    const map = JSON.parse(process.env.LIFF_TENANT_MAP || '{}')
    for (const [liffId, tenantSlug] of Object.entries(map)) {
      if (tenantSlug === slug) return liffId
    }
    return null
  } catch {
    return null
  }
}
