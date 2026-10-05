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
 * Menggunakan localStorage key 'lorong_lucky_product_<VOUCHER_CODE>' agar hasil undian
 * konsisten untuk pengguna tersebut (tidak berubah-ubah setiap kali render atau reload).
 */
export function getOrDrawAwardedProduct(
  voucherCode: string,
  productNameRaw: string | null | undefined
): string | null {
  const pool = parseProductPool(productNameRaw)
  if (pool.count === 0) return null
  if (pool.count === 1) return pool.items[0]

  const storageKey = `lorong_lucky_product_${voucherCode.trim().toUpperCase()}`

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && pool.items.some((it) => it.toLowerCase() === saved.toLowerCase())) {
        return saved
      }

      // Undi 1 produk acak dari daftar pilihan
      const randomIndex = Math.floor(Math.random() * pool.items.length)
      const picked = pool.items[randomIndex]
      localStorage.setItem(storageKey, picked)
      return picked
    } catch {
      // Fallback jika localStorage tidak dapat diakses
    }
  }

  const randomIndex = Math.floor(Math.random() * pool.items.length)
  return pool.items[randomIndex]
}
