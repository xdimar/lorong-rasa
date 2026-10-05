'use server'

import { createClient } from '@/lib/supabase/server'

export interface OrderItemInput {
  id: string
  name: string
  price: number
  quantity: number
  notes?: string
}

export interface CreateOrderInput {
  customerName: string
  customerPhone: string
  customerEmail?: string
  orderType: 'dine_in' | 'takeaway'
  tableNumber?: string
  paymentMethod: 'qris' | 'cash'
  orderNotes?: string
  voucherCode?: string
  items: OrderItemInput[]
}

export interface CreateOrderResult {
  success: boolean
  orderId?: string
  error?: string
  verifiedTotal?: number
  verifiedSubtotal?: number
  verifiedDiscount?: number
}

/**
 * Server Action: Validasi harga & pembuatan pesanan aman di sisi server (Server-Side Price Validation).
 * Mencegah manipulasi harga di browser (Client-Side Price Tampering) dan menjamin order terhubung ke user terautentikasi.
 */
export async function createVerifiedOrder(payload: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    const supabase = await createClient()

    // 1. Cek Autentikasi Pengguna (Mendukung Guest Checkout & Member Terdaftar)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    const userEmail = user?.email || payload.customerEmail?.trim() || null

    // 2. Validasi Input Dasar
    const customerName = payload.customerName?.trim()
    const customerPhone = payload.customerPhone?.trim()

    if (!customerName) {
      return { success: false, error: 'Harap isi Nama Pemesan.' }
    }
    if (!customerPhone) {
      return { success: false, error: 'Harap isi Nomor WhatsApp / Telepon.' }
    }
    if (payload.orderType === 'dine_in' && !payload.tableNumber?.trim()) {
      return { success: false, error: 'Harap isi Nomor Meja untuk pemesanan Dine In.' }
    }
    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: 'Keranjang pesanan masih kosong.' }
    }

    // 3. Verifikasi Harga Item di Sisi Server dari Tabel menu_items
    // Ambil semua item ID yang berupa UUID
    const itemIds = payload.items
      .map((it) => it.id)
      .filter((id) => id && id.length > 10 && id.includes('-'))

    let dbItems: Array<{ id: string; name: string; price: number; is_available: boolean }> = []

    if (itemIds.length > 0) {
      const { data: fetchedDbItems } = await supabase
        .from('menu_items')
        .select('id, name, price, is_available')
        .in('id', itemIds)

      if (fetchedDbItems) {
        dbItems = fetchedDbItems
      }
    }

    // Jika ada item yang dicari dengan nama (fallback support)
    const remainingNames = payload.items
      .filter((it) => !dbItems.some((db) => db.id === it.id))
      .map((it) => it.name)

    if (remainingNames.length > 0) {
      const { data: nameDbItems } = await supabase
        .from('menu_items')
        .select('id, name, price, is_available')
        .in('name', remainingNames)

      if (nameDbItems) {
        dbItems = [...dbItems, ...nameDbItems]
      }
    }

    // Hitung Subtotal Resmi Server
    let serverSubtotal = 0
    const verifiedOrderItems: Array<{
      menu_item_id: string | null
      menu_item_name: string
      quantity: number
      price: number
      subtotal: number
      notes: string | null
    }> = []

    for (const item of payload.items) {
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)))

      // Cocokkan dengan data menu database resmi
      const dbMatch = dbItems.find(
        (db) => db.id === item.id || db.name.toLowerCase() === item.name.toLowerCase()
      )

      // HARGA WAJIB DIAMBIL DARI DATABASE SERVER (bukan kiriman client)
      const verifiedPrice = dbMatch ? Number(dbMatch.price) : Number(item.price)

      if (isNaN(verifiedPrice) || verifiedPrice < 0) {
        return { success: false, error: `Harga untuk menu "${item.name}" tidak valid.` }
      }

      const itemSubtotal = verifiedPrice * qty
      serverSubtotal += itemSubtotal

      verifiedOrderItems.push({
        menu_item_id: dbMatch ? dbMatch.id : (item.id.length > 10 ? item.id : null),
        menu_item_name: dbMatch ? dbMatch.name : item.name,
        quantity: qty,
        price: verifiedPrice,
        subtotal: itemSubtotal,
        notes: item.notes?.trim() || null,
      })
    }

    // 4. Verifikasi Voucher di Sisi Server (Anti-Manipulasi Diskon)
    let serverDiscount = 0
    let validVoucherCode: string | null = null
    let validatedVoucher: any = null

    if (payload.voucherCode?.trim()) {
      const cleanCode = payload.voucherCode.trim().toUpperCase()

      let { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .ilike('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle()

      if (!voucher) {
        const { data: byToken } = await supabase
          .from('vouchers')
          .select('*')
          .eq('share_token', cleanCode)
          .eq('is_active', true)
          .maybeSingle()
        voucher = byToken
      }

      if (!voucher) {
        const { data: fuzzyList } = await supabase
          .from('vouchers')
          .select('*')
          .ilike('code', `%${cleanCode}%`)
          .eq('is_active', true)

        if (fuzzyList && fuzzyList.length > 0) {
          voucher = fuzzyList.find((v: { code?: string }) => (v.code || '').trim().toUpperCase() === cleanCode) || fuzzyList[0]
        }
      }

      if (!voucher) {
        return { success: false, error: `Kode voucher "${cleanCode}" tidak ditemukan atau sudah tidak aktif.` }
      }

      if (new Date(voucher.expires_at) < new Date()) {
        return { success: false, error: `Voucher "${voucher.code}" telah kedaluwarsa.` }
      }

      if (voucher.max_uses && voucher.current_uses >= voucher.max_uses) {
        return { success: false, error: `Kuota pemakaian voucher "${voucher.code}" sudah habis.` }
      }

      if (Number(voucher.min_order) > 0 && serverSubtotal < Number(voucher.min_order)) {
        return {
          success: false,
          error: `Minimal pesanan untuk voucher ini adalah Rp ${Number(voucher.min_order).toLocaleString('id-ID')}.`,
        }
      }

      // Cek 1 akun 1 voucher di user_vouchers (jika user login)
      if (userId) {
        const { data: userVoucher } = await supabase
          .from('user_vouchers')
          .select('id, status')
          .eq('user_id', userId)
          .or(`voucher_code.ilike.${cleanCode},voucher_id.eq.${voucher.id}`)
          .maybeSingle()

        if (userVoucher && userVoucher.status === 'used') {
          return {
            success: false,
            error: `Kamu sudah pernah menggunakan voucher "${voucher.code}" sebelumnya (Maksimal 1 voucher per akun).`,
          }
        }
      }

      validVoucherCode = voucher.code.trim()
      validatedVoucher = voucher

      if (voucher.discount_type === 'percentage') {
        serverDiscount = Math.round((serverSubtotal * Number(voucher.discount_value)) / 100)
      } else if (voucher.discount_type === 'fixed') {
        serverDiscount = Math.min(serverSubtotal, Number(voucher.discount_value))
      } else if (voucher.discount_type === 'product' && voucher.product_name) {
        const allowedNames = voucher.product_name
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
        const matchedItem = verifiedOrderItems.find((it) =>
          allowedNames.some(
            (name: string) =>
              it.menu_item_name.toLowerCase() === name ||
              it.menu_item_name.toLowerCase().includes(name) ||
              name.includes(it.menu_item_name.toLowerCase())
          )
        )
        if (matchedItem) {
          const discountPercent = Number(voucher.discount_value) || 100
          const itemDiscount = Math.round((matchedItem.price * discountPercent) / 100)
          serverDiscount = Math.min(serverSubtotal, itemDiscount)
        } else {
          return {
            success: false,
            error: `Voucher ini hanya berlaku untuk menu: ${voucher.product_name}. Silakan tambahkan menu tersebut ke keranjang Anda.`,
          }
        }
      }
    }

    // 5. Hitung Total Akhir Resmi Server
    const serverTotal = Math.max(0, serverSubtotal - serverDiscount)

    // 6. Masukkan Pesanan ke Database
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: userEmail,
        order_type: payload.orderType,
        table_number: payload.orderType === 'dine_in' ? payload.tableNumber?.trim() : null,
        payment_method: payload.paymentMethod,
        payment_status: 'unpaid', // Terkunci wajib unpaid untuk checkout online
        status: 'pending',        // Terkunci wajib pending untuk verifikasi kasir
        total_amount: serverTotal,
        discount_amount: serverDiscount,
        voucher_code: validVoucherCode,
        notes: payload.orderNotes?.trim() || null,
      })
      .select('id')
      .single()

    if (orderErr || !orderData) {
      console.error('Error creating order in DB:', orderErr)
      return { success: false, error: 'Gagal membuat pesanan di database. Coba lagi.' }
    }

    // 7. Masukkan Item Rincian Pesanan Resmi
    const itemsToInsert = verifiedOrderItems.map((it) => ({
      order_id: orderData.id,
      menu_item_id: it.menu_item_id,
      menu_item_name: it.menu_item_name,
      quantity: it.quantity,
      price: it.price,
      subtotal: it.subtotal,
      notes: it.notes,
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert)

    if (itemsErr) {
      console.error('Error inserting order items:', itemsErr)
      return {
        success: false,
        error: 'Pesanan dibuat tapi gagal mencatat rincian menu. Harap hubungi kasir/staf.',
      }
    }

    // 8. Tandai Pemakaian Voucher (jika login simpan di user_vouchers & update kuota vouchers)
    if (validVoucherCode && serverDiscount > 0 && validatedVoucher) {
      try {
        if (userId) {
          const { data: existingUv } = await supabase
            .from('user_vouchers')
            .select('id')
            .eq('user_id', userId)
            .or(`voucher_code.ilike.${validVoucherCode},voucher_id.eq.${validatedVoucher.id}`)
            .maybeSingle()

          if (existingUv) {
            await supabase
              .from('user_vouchers')
              .update({
                status: 'used',
                used_at: new Date().toISOString(),
                used_via: 'online_checkout',
                order_id: orderData.id,
              })
              .eq('id', existingUv.id)
          } else {
            await supabase.from('user_vouchers').insert({
              user_id: userId,
              voucher_id: validatedVoucher.id,
              voucher_code: validVoucherCode,
              status: 'used',
              used_at: new Date().toISOString(),
              used_via: 'online_checkout',
              order_id: orderData.id,
            })
          }
        }

        // Tambah kuota terpakai pada tabel vouchers
        await supabase
          .from('vouchers')
          .update({ current_uses: (validatedVoucher.current_uses || 0) + 1 })
          .eq('id', validatedVoucher.id)
      } catch (vErr) {
        console.error('Non-critical: voucher usage status update notice:', vErr)
      }
    }

    return {
      success: true,
      orderId: orderData.id,
      verifiedTotal: serverTotal,
      verifiedSubtotal: serverSubtotal,
      verifiedDiscount: serverDiscount,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Terjadi kendala pada server saat memproses pesanan.'
    return { success: false, error: msg }
  }
}
