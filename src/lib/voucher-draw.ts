/**
 * Helper untuk pengundian produk acak pada voucher tipe 'product' dengan banyak pilihan produk.
 * Memastikan bila admin memilih banyak menu pada voucher produk spesifik,
 * setiap pengguna yang mengklaim voucher akan mendapatkan 1 menu acak yang adil dan stabil.
 */

export interface ProductPoolInfo {
  isPool: boolean
  items: string[]
  count: number
}

export function parseProductPool(productNameRaw: string | null | undefined): ProductPoolInfo {
  if (!productNameRaw) {
    return { isPool: false, items: [], count: 0 }
  }
  const items = productNameRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    isPool: items.length > 1,
    items,
    count: items.length,
  }
}

/**
 * Mengambil atau mengundi 1 produk acak untuk voucher tertentu.
/**
 * Menyimpan hasil undian produk ke localStorage agar selalu konsisten di perangkat pengguna.
 */
export function setStoredAwardedProduct(voucherCode: string, productName: string): void {
  if (typeof window === 'undefined' || !voucherCode || !productName) return
  try {
    const storageKey = `lorong_lucky_product_${voucherCode.trim().toUpperCase()}`
    localStorage.setItem(storageKey, productName.trim())
  } catch {}
}

/**
 * Mengambil atau mengundi 1 produk acak untuk voucher tertentu.
 * Menggunakan prioritas:
 * 1. Explicit item / override dari parameter (misal dari scan QR atau query param ?item=)
 * 2. URL search query (?item= atau ?product=)
 * 3. localStorage key 'lorong_lucky_product_<VOUCHER_CODE>'
 * 4. Item dari cart/preferredItems yang cocok
 * 5. Undian acak yang disimpan permanen
 */
export function getOrDrawAwardedProduct(
  voucherCode: string,
  productNameRaw: string | null | undefined,
  preferredItemNames?: string[] | string | null
): string | null {
  const pool = parseProductPool(productNameRaw)
  if (pool.count === 0) return null
  if (pool.count === 1) return pool.items[0]

  const storageKey = `lorong_lucky_product_${voucherCode.trim().toUpperCase()}`

  // 1. Jika preferredItemNames adalah string tunggal (explicit target dari scan / props)
  if (typeof preferredItemNames === 'string' && preferredItemNames.trim()) {
    const explicitClean = preferredItemNames.trim()
    const matched = pool.items.find(
      (p) =>
        p.toLowerCase() === explicitClean.toLowerCase() ||
        p.toLowerCase().includes(explicitClean.toLowerCase()) ||
        explicitClean.toLowerCase().includes(p.toLowerCase())
    )
    if (matched) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, matched)
        } catch {}
      }
      return matched
    }
  }

  // 2. Cek apakah ada query param di browser (?item= atau ?product=)
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const paramItem = urlParams.get('item') || urlParams.get('product')
      if (paramItem && paramItem.trim()) {
        const decoded = decodeURIComponent(paramItem).trim()
        const matchedFromUrl = pool.items.find(
          (p) =>
            p.toLowerCase() === decoded.toLowerCase() ||
            p.toLowerCase().includes(decoded.toLowerCase()) ||
            decoded.toLowerCase().includes(p.toLowerCase())
        )
        if (matchedFromUrl) {
          localStorage.setItem(storageKey, matchedFromUrl)
          return matchedFromUrl
        }
      }
    } catch {}
  }

  // 3. Cek preferensi dari keranjang belanja jika preferredItemNames berupa array
  const preferredArray = Array.isArray(preferredItemNames) ? preferredItemNames : undefined
  const matchingPreferredItem = preferredArray?.find((prefName) =>
    pool.items.some(
      (p) =>
        p.toLowerCase() === prefName.toLowerCase() ||
        p.toLowerCase().includes(prefName.toLowerCase()) ||
        prefName.toLowerCase().includes(p.toLowerCase())
    )
  )

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && pool.items.some((it) => it.toLowerCase() === saved.toLowerCase())) {
        if (!matchingPreferredItem || matchingPreferredItem.toLowerCase() === saved.toLowerCase()) {
          return saved
        }
      }

      if (matchingPreferredItem) {
        const matchedPoolItem = pool.items.find(
          (p) =>
            p.toLowerCase() === matchingPreferredItem.toLowerCase() ||
            p.toLowerCase().includes(matchingPreferredItem.toLowerCase()) ||
            matchingPreferredItem.toLowerCase().includes(p.toLowerCase())
        )
        const chosen = matchedPoolItem || matchingPreferredItem
        localStorage.setItem(storageKey, chosen)
        return chosen
      }

      // Undi 1 produk acak dari daftar pilihan dan simpan agar konsisten
      const randomIndex = Math.floor(Math.random() * pool.items.length)
      const picked = pool.items[randomIndex]
      localStorage.setItem(storageKey, picked)
      return picked
    } catch {
      // Fallback jika localStorage tidak dapat diakses
    }
  }

  if (matchingPreferredItem) {
    return matchingPreferredItem
  }

  const randomIndex = Math.floor(Math.random() * pool.items.length)
  return pool.items[randomIndex]
}
