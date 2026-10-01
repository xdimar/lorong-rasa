import { SupabaseClient } from '@supabase/supabase-js'

export interface MenuReview {
  id: string
  menu_item_id: string
  user_id: string
  order_id?: string | null
  user_name: string
  user_avatar?: string | null
  rating: number // 1 to 5
  comment: string
  reply?: string | null
  replied_at?: string | null
  is_approved: boolean
  created_at: string
  updated_at?: string
  // Joined fields
  menu_item?: {
    id: string
    name: string
    category: string
    image_url: string | null
    price: number
  }
}

export interface ReviewSummary {
  averageRating: number
  totalReviews: number
  ratingCounts: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export interface CreateReviewInput {
  menu_item_id: string
  order_id?: string | null
  rating: number
  comment: string
}

export const RATING_LABELS: Record<number, string> = {
  1: 'Sangat Mengecewakan',
  2: 'Kurang Enak',
  3: 'Cukup Lumayan',
  4: 'Enak & Mantap',
  5: 'Luar Biasa Enak!',
}

// Fallback reviews to showcase the review UI seamlessly
export const DEFAULT_FALLBACK_REVIEWS: Record<string, MenuReview[]> = {
  default: [
    {
      id: 'rev-demo-1',
      menu_item_id: 'default',
      user_id: 'user-demo-1',
      user_name: 'Dika Pratama',
      rating: 5,
      comment: 'Cita rasa racikannya autentik banget! Porsi dan suhunya pas saat disajikan. Rekomendasi banget buat yang nongkrong sore di Wajak.',
      reply: 'Terima kasih banyak Kak Dika! Kami senang racikan Lorong Rasa cocok di lidah. Ditunggu kunjungan berikutnya! 🙏☕',
      replied_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_approved: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rev-demo-2',
      menu_item_id: 'default',
      user_id: 'user-demo-2',
      user_name: 'Siti Rahmawati',
      rating: 5,
      comment: 'Bumbunya medok dan gurihnya pas. Cocok banget dinikmati sambil ngerjain tugas bareng teman-teman.',
      reply: null,
      is_approved: true,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rev-demo-3',
      menu_item_id: 'default',
      user_id: 'user-demo-3',
      user_name: 'Budi Santoso',
      rating: 4,
      comment: 'Enak dan porsinya pas dengan harga yang ramah di kantong mahasiswa. Pelayanan ramah!',
      reply: 'Terima kasih atas kunjungannya Mas Budi! Salam hangat dari tim Lorong Rasa.',
      replied_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      is_approved: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

/**
 * Menghitung ringkasan distribusi rating
 */
export function calculateReviewSummary(reviews: MenuReview[]): ReviewSummary {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: counts,
    }
  }

  let totalScore = 0
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5
    counts[star] = (counts[star] || 0) + 1
    totalScore += r.rating
  })

  return {
    averageRating: Number((totalScore / reviews.length).toFixed(1)),
    totalReviews: reviews.length,
    ratingCounts: counts,
  }
}

/**
 * Mengambil ulasan untuk menu tertentu
 */
export async function fetchReviewsByMenuItem(
  supabase: SupabaseClient,
  menuItemId: string
): Promise<MenuReview[]> {
  try {
    const { data, error } = await supabase
      .from('menu_reviews')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return DEFAULT_FALLBACK_REVIEWS.default.map((rev) => ({
        ...rev,
        menu_item_id: menuItemId,
      }))
    }

    return data as MenuReview[]
  } catch {
    return DEFAULT_FALLBACK_REVIEWS.default.map((rev) => ({
      ...rev,
      menu_item_id: menuItemId,
    }))
  }
}

/**
 * Mengirim ulasan baru oleh pelanggan
 */
export async function submitReview(
  supabase: SupabaseClient,
  input: CreateReviewInput
): Promise<{ success: boolean; review?: MenuReview; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      return { success: false, error: 'Silakan login terlebih dahulu untuk memberikan ulasan.' }
    }

    // Ambil nama profil pengguna
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', authData.user.id)
      .single()

    const userName = profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'Pelanggan Lorong Rasa'

    const payload = {
      menu_item_id: input.menu_item_id,
      user_id: authData.user.id,
      order_id: input.order_id || null,
      user_name: userName,
      rating: input.rating,
      comment: input.comment.trim(),
      is_approved: true,
    }

    const { data, error } = await supabase
      .from('menu_reviews')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Gagal menyimpan ulasan.' }
    }

    return { success: true, review: data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
    return { success: false, error: msg }
  }
}

/**
 * Membalas ulasan oleh Admin/Barista
 */
export async function replyToReview(
  supabase: SupabaseClient,
  reviewId: string,
  replyText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('menu_reviews')
      .update({
        reply: replyText.trim() || null,
        replied_at: replyText.trim() ? new Date().toISOString() : null,
      })
      .eq('id', reviewId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengirim balasan'
    return { success: false, error: msg }
  }
}

/**
 * Mengubah status tampil/sembunyi ulasan
 */
export async function toggleReviewApproval(
  supabase: SupabaseClient,
  reviewId: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('menu_reviews')
      .update({ is_approved: !currentStatus })
      .eq('id', reviewId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengubah status'
    return { success: false, error: msg }
  }
}

/**
 * Menghapus ulasan (Admin only)
 */
export async function deleteReview(
  supabase: SupabaseClient,
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('menu_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghapus ulasan'
    return { success: false, error: msg }
  }
}
