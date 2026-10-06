import { SupabaseClient } from '@supabase/supabase-js'

export type LoyaltyTierName = 'Bronze' | 'Silver' | 'Gold'

export interface LoyaltyTierInfo {
  name: LoyaltyTierName
  title: string
  color: string
  bgGlow: string
  borderGlow: string
  minPoints: number
  maxPoints: number | null
  perks: string[]
}

export interface LoyaltyReward {
  id: string
  title: string
  description: string
  points_required: number
  reward_type: 'voucher' | 'free_item' | 'discount'
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  icon_name: string
  is_active: boolean
  created_at?: string
}

export interface LoyaltyTransaction {
  id: string
  user_id: string
  points: number
  type: 'earned' | 'redeemed' | 'bonus' | 'adjusted'
  description: string
  order_id: string | null
  created_at: string
}

export const LOYALTY_TIERS: Record<LoyaltyTierName, LoyaltyTierInfo> = {
  Bronze: {
    name: 'Bronze',
    title: 'Bronze Member',
    color: '#cd7f32',
    bgGlow: 'rgba(205, 127, 50, 0.15)',
    borderGlow: 'rgba(205, 127, 50, 0.4)',
    minPoints: 0,
    maxPoints: 49,
    perks: ['Dapatkan 1 Poin tiap Rp 10.000 belanja', 'Akses klaim voucher promo reguler', 'Kartu member digital QR Barista'],
  },
  Silver: {
    name: 'Silver',
    title: 'Silver Member',
    color: '#d1d5db',
    bgGlow: 'rgba(209, 213, 219, 0.18)',
    borderGlow: 'rgba(209, 213, 219, 0.5)',
    minPoints: 50,
    maxPoints: 149,
    perks: ['Semua keuntungan Bronze', 'Bonus poin ganda di hari ulang tahun & festival', 'Voucher diskon khusus Silver Member'],
  },
  Gold: {
    name: 'Gold',
    title: 'Gold VIP Member',
    color: '#d4af37',
    bgGlow: 'rgba(212, 175, 55, 0.22)',
    borderGlow: 'rgba(212, 175, 55, 0.6)',
    minPoints: 150,
    maxPoints: null,
    perks: ['Semua keuntungan Silver', 'Prioritas antrean & racikan barista', 'Free refill teh/kopi tertentu & undangan cicip menu baru'],
  },
}

export const DEFAULT_LOYALTY_REWARDS: LoyaltyReward[] = [
  {
    id: 'reward-10k',
    title: 'Voucher Hemat Rp 10.000',
    description: 'Potongan langsung Rp 10.000 untuk pesanan apa pun dengan minimal belanja Rp 35.000.',
    points_required: 15,
    reward_type: 'voucher',
    discount_type: 'fixed',
    discount_value: 10000,
    min_order: 35000,
    icon_name: 'Tag',
    is_active: true,
  },
  {
    id: 'reward-20pct',
    title: 'Voucher Diskon 20%',
    description: 'Diskon 20% untuk semua menu racikan Lorong Rasa (Min. belanja Rp 45.000).',
    points_required: 25,
    reward_type: 'voucher',
    discount_type: 'percentage',
    discount_value: 20,
    min_order: 45000,
    icon_name: 'Percent',
    is_active: true,
  },
  {
    id: 'reward-25k',
    title: 'Voucher Spesial Rp 25.000',
    description: 'Potongan besar Rp 25.000 untuk pesanan dine in maupun takeaway dengan min. belanja Rp 60.000.',
    points_required: 40,
    reward_type: 'voucher',
    discount_type: 'fixed',
    discount_value: 25000,
    min_order: 60000,
    icon_name: 'Sparkles',
    is_active: true,
  },
  {
    id: 'reward-free-coffee',
    title: 'Traktiran Kopi Lorong Rasa (Rp 35.000)',
    description: 'Voucher senilai Rp 35.000 setara free minuman signature favoritmu!',
    points_required: 60,
    reward_type: 'voucher',
    discount_type: 'fixed',
    discount_value: 35000,
    min_order: 35000,
    icon_name: 'Coffee',
    is_active: true,
  },
]

/**
 * Hitung tingkatan (tier) berdasarkan jumlah poin
 */
export function getLoyaltyTier(points: number): LoyaltyTierInfo {
  const pts = Math.max(0, points || 0)
  if (pts >= 150) return LOYALTY_TIERS.Gold
  if (pts >= 50) return LOYALTY_TIERS.Silver
  return LOYALTY_TIERS.Bronze
}

/**
 * Hitung progres menuju tier berikutnya
 */
export function getTierProgress(points: number): {
  currentTier: LoyaltyTierInfo
  nextTier: LoyaltyTierInfo | null
  pointsNeeded: number
  progressPercent: number
} {
  const currentTier = getLoyaltyTier(points)
  const pts = Math.max(0, points || 0)

  if (currentTier.name === 'Bronze') {
    const nextTier = LOYALTY_TIERS.Silver
    const needed = Math.max(0, nextTier.minPoints - pts)
    const progress = Math.min(100, Math.round((pts / nextTier.minPoints) * 100))
    return { currentTier, nextTier, pointsNeeded: needed, progressPercent: progress }
  }

  if (currentTier.name === 'Silver') {
    const nextTier = LOYALTY_TIERS.Gold
    const needed = Math.max(0, nextTier.minPoints - pts)
    const currentSpan = pts - LOYALTY_TIERS.Silver.minPoints
    const totalSpan = nextTier.minPoints - LOYALTY_TIERS.Silver.minPoints
    const progress = Math.min(100, Math.round((currentSpan / totalSpan) * 100))
    return { currentTier, nextTier, pointsNeeded: needed, progressPercent: progress }
  }

  return {
    currentTier,
    nextTier: null,
    pointsNeeded: 0,
    progressPercent: 100,
  }
}

/**
 * 1 Poin per Rp 10.000 belanja
 */
export function calculatePointsEarned(totalAmount: number): number {
  if (!totalAmount || totalAmount <= 0) return 0
  return Math.floor(totalAmount / 10000)
}

/**
 * Tambahkan poin ke user setelah order lunas/selesai
 */
export async function awardLoyaltyPointsForOrder(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  totalAmount: number
): Promise<{ success: boolean; pointsAwarded: number; newTotalPoints?: number; error?: string }> {
  try {
    const pointsToAward = calculatePointsEarned(totalAmount)
    if (pointsToAward <= 0) {
      return { success: true, pointsAwarded: 0 }
    }

    // 1. Coba eksekusi melalui PostgreSQL RPC (Atomik & Bypass Trigger RLS dengan aman)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('award_order_loyalty_points', {
      p_order_id: orderId,
      p_user_id: userId,
      p_total_amount: totalAmount,
    })

    if (!rpcErr && rpcData && typeof rpcData === 'object' && 'success' in rpcData) {
      const typed = rpcData as { success: boolean; points_awarded?: number; new_points?: number; error?: string }
      if (typed.success) {
        return {
          success: true,
          pointsAwarded: typed.points_awarded ?? pointsToAward,
          newTotalPoints: typed.new_points,
        }
      }
    }

    // 2. Fallback manual jika RPC belum terpasang di database remote
    // Cek idempotency: apakah order ini sudah pernah dapat poin earned?
    const { data: existingTx } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'earned')
      .maybeSingle()

    if (existingTx) {
      return { success: true, pointsAwarded: 0 } // Sudah pernah diberi poin
    }

    // Ambil poin saat ini
    const { data: profile } = await supabase
      .from('profiles')
      .select('loyalty_points')
      .eq('id', userId)
      .single()

    const currentPoints = profile?.loyalty_points ?? 0
    const newPoints = currentPoints + pointsToAward

    // Catat transaksi
    await supabase.from('loyalty_transactions').insert({
      user_id: userId,
      points: pointsToAward,
      type: 'earned',
      description: `Perolehan poin dari pesanan #${orderId.slice(0, 8).toUpperCase()}`,
      order_id: orderId,
    })

    // Update profile
    await supabase
      .from('profiles')
      .update({ loyalty_points: newPoints })
      .eq('id', userId)

    return { success: true, pointsAwarded: pointsToAward, newTotalPoints: newPoints }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memberikan poin'
    return { success: false, pointsAwarded: 0, error: msg }
  }
}

/**
 * Tukar poin dengan voucher hadiah secara atomik via RPC
 */
export async function redeemLoyaltyReward(
  supabase: SupabaseClient,
  userId: string,
  reward: LoyaltyReward
): Promise<{ success: boolean; newPoints?: number; voucherCode?: string; error?: string }> {
  try {
    // 1. Coba eksekusi melalui PostgreSQL RPC redeem_loyalty_reward
    const { data: rpcData, error: rpcErr } = await supabase.rpc('redeem_loyalty_reward', {
      p_reward_id: reward.id,
      p_user_id: userId,
    })

    if (!rpcErr && rpcData && typeof rpcData === 'object' && 'success' in rpcData) {
      const typed = rpcData as {
        success: boolean
        voucher_code?: string
        new_points?: number
        error?: string
      }
      if (typed.success) {
        return {
          success: true,
          voucherCode: typed.voucher_code,
          newPoints: typed.new_points,
        }
      } else {
        return {
          success: false,
          error: typed.error || 'Gagal menukarkan reward.',
        }
      }
    }

    // 2. Fallback manual jika RPC belum diterapkan
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('loyalty_points, full_name, email')
      .eq('id', userId)
      .single()

    if (pErr || !profile) {
      return { success: false, error: 'Profil member tidak ditemukan.' }
    }

    const currentPoints = profile.loyalty_points ?? 0
    if (currentPoints < reward.points_required) {
      return {
        success: false,
        error: `Poin tidak mencukupi. Anda memiliki ${currentPoints} poin, butuh ${reward.points_required} poin.`,
      }
    }

    const newPoints = currentPoints - reward.points_required
    const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const voucherCode = `POIN-${uniqueSuffix}`
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: createdVoucher, error: vErr } = await supabase
      .from('vouchers')
      .insert({
        code: voucherCode,
        description: `[Reward Tukar Poin] ${reward.title}`,
        discount_type: reward.discount_type,
        discount_value: reward.discount_value,
        min_order: reward.min_order,
        max_uses: 1,
        current_uses: 0,
        expires_at: expiresAt,
        is_active: true,
      })
      .select('id')
      .single()

    if (vErr || !createdVoucher) {
      return { success: false, error: `Gagal menerbitkan voucher: ${vErr?.message || 'Error database'}` }
    }

    await supabase.from('user_vouchers').insert({
      user_id: userId,
      voucher_id: createdVoucher.id,
      voucher_code: voucherCode,
      status: 'claimed',
    })

    await supabase.from('loyalty_transactions').insert({
      user_id: userId,
      points: -reward.points_required,
      type: 'redeemed',
      description: `Penukaran ${reward.points_required} poin untuk voucher ${voucherCode} (${reward.title})`,
      order_id: null,
    })

    await supabase
      .from('profiles')
      .update({ loyalty_points: newPoints })
      .eq('id', userId)

    return {
      success: true,
      newPoints,
      voucherCode,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menukarkan poin.'
    return { success: false, error: msg }
  }
}
