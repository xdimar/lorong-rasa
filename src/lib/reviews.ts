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
  replied_by?: string | null
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

export type ReviewSortOption = 'newest' | 'rating_desc' | 'rating_asc'

export const RATING_LABELS: Record<number, string> = {
  1: 'Sangat Mengecewakan',
  2: 'Kurang Enak',
  3: 'Cukup Lumayan',
  4: 'Enak & Mantap',
  5: 'Luar Biasa Enak!',
}

// Default fallback reviews is empty - only real reviews will be displayed
export const DEFAULT_FALLBACK_REVIEWS: Record<string, MenuReview[]> = {}

const LOCAL_STORAGE_KEY = 'lorong_rasa_custom_reviews'

function getLocalReviews(): MenuReview[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed: MenuReview[] = JSON.parse(raw)
    // Filter out any previous dummy/template reviews (e.g. rev-demo-*)
    return parsed.filter(
      (r) =>
        !r.id.startsWith('rev-demo-') &&
        r.user_id !== 'user-demo-1' &&
        r.user_id !== 'user-demo-2' &&
        r.user_id !== 'user-demo-3'
    )
  } catch {
    return []
  }
}

function saveLocalReviews(reviews: MenuReview[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviews))
  } catch {}
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
    const star = Math.max(1, Math.min(5, Math.round(r.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5
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
 * Mengambil ulasan untuk menu tertentu dengan opsi sorting.
 * HANYA mengembalikan ulasan asli (tidak ada ulasan template/dummy).
 */
export async function fetchReviewsByMenuItem(
  supabase: SupabaseClient,
  menuItemId: string,
  sortBy: ReviewSortOption = 'newest'
): Promise<MenuReview[]> {
  const localList = getLocalReviews().filter((r) => r.menu_item_id === menuItemId)

  try {
    let query = supabase
      .from('menu_reviews')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .eq('is_approved', true)

    if (sortBy === 'rating_desc') {
      query = query.order('rating', { ascending: false }).order('created_at', { ascending: false })
    } else if (sortBy === 'rating_asc') {
      query = query.order('rating', { ascending: true }).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (!error && data) {
      const dbIds = new Set(data.map((d: MenuReview) => d.id))
      const combined = [...localList.filter((l) => !dbIds.has(l.id)), ...data]
      return sortReviews(combined, sortBy)
    }
  } catch (err) {
    console.warn('Could not query menu_reviews table from database:', err)
  }

  // Hanya kembalikan ulasan riil yang tersimpan (tanpa dummy fallback)
  return sortReviews(localList, sortBy)
}

function sortReviews(list: MenuReview[], sortBy: ReviewSortOption): MenuReview[] {
  return [...list].sort((a, b) => {
    if (sortBy === 'rating_desc') {
      if (b.rating !== a.rating) return b.rating - a.rating
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === 'rating_asc') {
      if (a.rating !== b.rating) return a.rating - b.rating
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/**
 * Mengambil semua ulasan riil untuk Admin Dashboard
 */
export async function fetchAllReviewsForAdmin(
  supabase: SupabaseClient
): Promise<MenuReview[]> {
  const localList = getLocalReviews()

  try {
    const { data, error } = await supabase
      .from('menu_reviews')
      .select('*, menu_item:menu_items(id, name, category, image_url, price)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const dbIds = new Set(data.map((d: MenuReview) => d.id))
      const combined = [...localList.filter((l) => !dbIds.has(l.id)), ...data]
      return combined
    }
  } catch (err) {
    console.warn('Admin fetch reviews error:', err)
  }

  return localList
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
      return {
        success: false,
        error: 'Silakan login terlebih dahulu untuk memberikan ulasan.',
      }
    }

    // Ambil nama profil pengguna
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', authData.user.id)
      .maybeSingle()

    const userName =
      profile?.full_name?.trim() ||
      profile?.email?.split('@')[0] ||
      authData.user.user_metadata?.full_name ||
      authData.user.email?.split('@')[0] ||
      'Pelanggan Lorong Rasa'

    const payload = {
      menu_item_id: input.menu_item_id,
      user_id: authData.user.id,
      order_id: input.order_id || null,
      user_name: userName,
      rating: input.rating,
      comment: input.comment.trim(),
      is_approved: true,
    }

    let createdReview: MenuReview | null = null

    try {
      const { data, error } = await supabase
        .from('menu_reviews')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        createdReview = data as MenuReview
      }
    } catch {}

    // Fallback local resilience if table not yet created
    if (!createdReview) {
      createdReview = {
        id: 'rev-usr-' + Date.now(),
        menu_item_id: input.menu_item_id,
        user_id: authData.user.id,
        order_id: input.order_id || null,
        user_name: userName,
        rating: input.rating,
        comment: input.comment.trim(),
        reply: null,
        replied_at: null,
        is_approved: true,
        created_at: new Date().toISOString(),
      }
      const existing = getLocalReviews()
      saveLocalReviews([createdReview, ...existing])
    }

    return { success: true, review: createdReview }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
    return { success: false, error: msg }
  }
}

/**
 * Mengedit ulasan milik sendiri
 */
export async function updateUserReview(
  supabase: SupabaseClient,
  reviewId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; review?: MenuReview; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      return { success: false, error: 'Silakan login terlebih dahulu.' }
    }

    // Try Supabase update
    try {
      const { data, error } = await supabase
        .from('menu_reviews')
        .update({
          rating,
          comment: comment.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('user_id', authData.user.id)
        .select()
        .maybeSingle()

      if (!error && data) {
        return { success: true, review: data }
      }
    } catch {}

    // Local update fallback
    const local = getLocalReviews()
    const targetIdx = local.findIndex((r) => r.id === reviewId)
    if (targetIdx !== -1) {
      local[targetIdx].rating = rating
      local[targetIdx].comment = comment.trim()
      local[targetIdx].updated_at = new Date().toISOString()
      saveLocalReviews(local)
      return { success: true, review: local[targetIdx] }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memperbarui ulasan'
    return { success: false, error: msg }
  }
}

/**
 * Menghapus ulasan (Customer sendiri atau Admin)
 */
export async function deleteUserReview(
  supabase: SupabaseClient,
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      await supabase.from('menu_reviews').delete().eq('id', reviewId)
    } catch {}

    const local = getLocalReviews()
    const filtered = local.filter((r) => r.id !== reviewId)
    saveLocalReviews(filtered)

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menghapus ulasan'
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
    const { data: authData } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    try {
      const { error } = await supabase
        .from('menu_reviews')
        .update({
          reply: replyText.trim() || null,
          replied_at: replyText.trim() ? now : null,
          replied_by: authData?.user?.id || null,
          updated_at: now,
        })
        .eq('id', reviewId)

      if (!error) return { success: true }
    } catch {}

    // Update in local cache as well
    const local = getLocalReviews()
    const targetIdx = local.findIndex((r) => r.id === reviewId)
    if (targetIdx !== -1) {
      local[targetIdx].reply = replyText.trim() || null
      local[targetIdx].replied_at = replyText.trim() ? now : null
      saveLocalReviews(local)
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengirim balasan'
    return { success: false, error: msg }
  }
}

/**
 * Menghapus balasan barista
 */
export async function deleteReply(
  supabase: SupabaseClient,
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  return replyToReview(supabase, reviewId, '')
}

/**
 * Mengubah status tampil/sembunyi ulasan (Moderasi Admin)
 */
export async function toggleReviewApproval(
  supabase: SupabaseClient,
  reviewId: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      await supabase
        .from('menu_reviews')
        .update({ is_approved: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', reviewId)
    } catch {}

    const local = getLocalReviews()
    const target = local.find((r) => r.id === reviewId)
    if (target) {
      target.is_approved = !currentStatus
      saveLocalReviews(local)
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengubah status'
    return { success: false, error: msg }
  }
}
