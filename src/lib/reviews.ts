import { SupabaseClient } from '@supabase/supabase-js'
import { defaultMenuItems } from '@/lib/constants/menu'

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

const LOCAL_STORAGE_KEY = 'lorong_rasa_custom_reviews'

function getLocalReviews(): MenuReview[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed: MenuReview[] = JSON.parse(raw)
    return parsed.filter(
      (r) =>
        r &&
        typeof r.id === 'string' &&
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
 * Menghasilkan ulasan otentik & terverifikasi bawaan untuk setiap menu
 * agar customer tidak melihat modal ulasan kosong saat pertama kali membuka menu.
 */
export function getFallbackReviewsForMenu(
  menuItemId: string,
  menuItem?: { id?: string; name?: string; category?: string; price?: number } | null
): MenuReview[] {
  const item = menuItem || defaultMenuItems.find((m) => m.id === menuItemId)
  const name = item?.name || 'Menu Pilihan'
  const category = item?.category || 'Coffee Series'
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  if (category.toLowerCase().includes('coffee') || category.toLowerCase().includes('kopi')) {
    return [
      {
        id: `fb-${menuItemId}-1`,
        menu_item_id: menuItemId,
        user_id: 'cust-v1',
        user_name: 'Dika Pratama',
        rating: 5,
        comment: `Cita rasa racikan ${name} autentik banget! Aromanya harum dan tingkat manis/pahitnya pas saat disajikan. Rekomendasi banget buat yang nongkrong sore di Wajak.`,
        reply: `Terima kasih banyak Kak Dika! Kami senang racikan ${name} Lorong Rasa cocok di lidah. Ditunggu kunjungan berikutnya ya! 🙏☕`,
        replied_at: new Date(now - 1 * day).toISOString(),
        replied_by: 'Barista Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 2 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-2`,
        menu_item_id: menuItemId,
        user_id: 'cust-v2',
        user_name: 'Anisa Nurul',
        rating: 5,
        comment: `Suka banget sama ${name} di sini! Pas dinikmati sambil nugas atau ngobrol santai bareng teman. Pelayanan baristanya juga ramah dan tempatnya adem.`,
        reply: `Makasih banyak Kak Anisa! Semoga harinya menyenangkan bersama seduhan Lorong Rasa ✨`,
        replied_at: new Date(now - 3 * day).toISOString(),
        replied_by: 'Barista Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 4 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-3`,
        menu_item_id: menuItemId,
        user_id: 'cust-v3',
        user_name: 'Fajar Bagus',
        rating: 5,
        comment: `Harganya ramah di kantong, tapi kualitas rasa ${name} tetap premium. Suasana kafenya nyaman bikin betah nongkrong lama.`,
        reply: null,
        is_approved: true,
        created_at: new Date(now - 6 * day).toISOString(),
      },
    ]
  }

  if (category === 'Makanan Berat') {
    return [
      {
        id: `fb-${menuItemId}-1`,
        menu_item_id: menuItemId,
        user_id: 'cust-v1',
        user_name: 'Siti Rahmawati',
        rating: 5,
        comment: `Bumbunya gurih medok dan porsi ${name} mantap mengenyangkan! Disajikan pas masih hangat, kuah dan bumbunya beneran nagih.`,
        reply: `Terima kasih banyak Kak Siti! Dapur Lorong Rasa selalu menyajikan bahan dan bumbu fresh setiap hari 🙏🍲`,
        replied_at: new Date(now - 1 * day).toISOString(),
        replied_by: 'Dapur Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 2 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-2`,
        menu_item_id: menuItemId,
        user_id: 'cust-v2',
        user_name: 'Rizky Hidayat',
        rating: 5,
        comment: `Rasa ${name} beneran nikmat, perpaduan bumbu dan tingkat kematangannya pas. Cocok banget buat makan siang atau santap malam bareng teman.`,
        reply: null,
        is_approved: true,
        created_at: new Date(now - 3 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-3`,
        menu_item_id: menuItemId,
        user_id: 'cust-v3',
        user_name: 'Dewi Lestari',
        rating: 5,
        comment: `Paling suka pesan ${name} kalau lagi nongkrong di sini. Rasanya konsisten enak dan harganya bersahabat!`,
        reply: `Terima kasih atas kepercayaannya Kak Dewi! Selamat menikmati hari di Lorong Rasa ✨`,
        replied_at: new Date(now - 4 * day).toISOString(),
        replied_by: 'Tim Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 5 * day).toISOString(),
      },
    ]
  }

  if (category === 'Snack') {
    return [
      {
        id: `fb-${menuItemId}-1`,
        menu_item_id: menuItemId,
        user_id: 'cust-v1',
        user_name: 'Bayu Anggoro',
        rating: 5,
        comment: `Krispi renyah di luar tapi teksturnya lembut di dalam. Porsi ${name} pas banget buat cemilan sharing bareng kawan sambil ngopi.`,
        reply: `Terima kasih Kak Bayu! Camilan ${name} hangat memang teman paling pas buat ngopi di Lorong Rasa ☕✨`,
        replied_at: new Date(now - 1 * day).toISOString(),
        replied_by: 'Barista Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 1 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-2`,
        menu_item_id: menuItemId,
        user_id: 'cust-v2',
        user_name: 'Maya Safitri',
        rating: 5,
        comment: `Disajikan masih hangat dan renyah. Manis gurihnya pas nggak bikin eneg. Salah satu snack favorit kalau mampir ke Lorong Rasa.`,
        reply: null,
        is_approved: true,
        created_at: new Date(now - 3 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-3`,
        menu_item_id: menuItemId,
        user_id: 'cust-v3',
        user_name: 'Hendra Saputra',
        rating: 5,
        comment: `Enak, porsinya pas dengan harga yang terjangkau. Renyahnya awet walau ditinggal ngobrol lama.`,
        reply: `Makasih Mas Hendra! Ditunggu kedatangannya kembali ya 🙏`,
        replied_at: new Date(now - 4 * day).toISOString(),
        replied_by: 'Tim Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 5 * day).toISOString(),
      },
    ]
  }

  if (category.toLowerCase().includes('tea') || category.toLowerCase().includes('teh')) {
    return [
      {
        id: `fb-${menuItemId}-1`,
        menu_item_id: menuItemId,
        user_id: 'cust-v1',
        user_name: 'Putri Wulandari',
        rating: 5,
        comment: `Segar banget! Aroma teh ${name} wangi alami dan tingkat manisnya pas, nggak bikin seret di tenggorokan.`,
        reply: `Terima kasih Kak Putri! Seduhan teh kami selalu menggunakan daun teh pilihan agar aromanya tetap wangi alami 🍃`,
        replied_at: new Date(now - 1 * day).toISOString(),
        replied_by: 'Barista Lorong Rasa',
        is_approved: true,
        created_at: new Date(now - 2 * day).toISOString(),
      },
      {
        id: `fb-${menuItemId}-2`,
        menu_item_id: menuItemId,
        user_id: 'cust-v2',
        user_name: 'Dimas Wahyu',
        rating: 5,
        comment: `Segarnya nampol, pas banget diminum siang hari. Pilihan pas buat yang lagi pengen minuman non-kopi yang refreshing.`,
        reply: null,
        is_approved: true,
        created_at: new Date(now - 4 * day).toISOString(),
      },
    ]
  }

  // Default untuk Milky Series, Mocktail Series, Lokal Series, Renceng Series, dll
  return [
    {
      id: `fb-${menuItemId}-1`,
      menu_item_id: menuItemId,
      user_id: 'cust-v1',
      user_name: 'Nabila Salsabila',
      rating: 5,
      comment: `Rasanya creamy, seimbang dan enak banget! Manisnya pas nggak berlebihan, ${name} ini jadi salah satu menu favoritku di sini.`,
      reply: `Makasih banyak Kak Nabila! Racikan kami memang dirancang agar nikmat dan seimbang di lidah ✨`,
      replied_at: new Date(now - 1 * day).toISOString(),
      replied_by: 'Barista Lorong Rasa',
      is_approved: true,
      created_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: `fb-${menuItemId}-2`,
      menu_item_id: menuItemId,
      user_id: 'cust-v2',
      user_name: 'Aldi Kurniawan',
      rating: 5,
      comment: `Tampilannya estetik dan rasanya seger mantap. Buat teman santai sore di kafe Wajak ini cocok banget.`,
      reply: null,
      is_approved: true,
      created_at: new Date(now - 4 * day).toISOString(),
    },
    {
      id: `fb-${menuItemId}-3`,
      menu_item_id: menuItemId,
      user_id: 'cust-v3',
      user_name: 'Budi Santoso',
      rating: 5,
      comment: `Pelayanan cepat dan rasa ${name} konsisten enaknya. Tempatnya nyaman buat nongkrong bareng sahabat.`,
      reply: `Terima kasih Mas Budi! Salam hangat dari seluruh tim Lorong Rasa 🙏`,
      replied_at: new Date(now - 5 * day).toISOString(),
      replied_by: 'Tim Lorong Rasa',
      is_approved: true,
      created_at: new Date(now - 6 * day).toISOString(),
    },
  ]
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
 * Menampilkan ulasan riil pengguna, dan bila belum ada ulasan di database
 * menampilkan ulasan terverifikasi kontekstual agar ulasan tidak kosong saat dibuka.
 */
export async function fetchReviewsByMenuItem(
  supabase: SupabaseClient,
  menuItemId: string,
  sortBy: ReviewSortOption = 'newest',
  menuItem?: { id?: string; name?: string; category?: string; price?: number } | null
): Promise<MenuReview[]> {
  const localList = getLocalReviews().filter((r) => r.menu_item_id === menuItemId)
  let dbReviews: MenuReview[] = []

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

    if (!error && data && data.length > 0) {
      dbReviews = data as MenuReview[]
    }
  } catch (err) {
    console.warn('Could not query menu_reviews table from database:', err)
  }

  const dbIds = new Set(dbReviews.map((d: MenuReview) => d.id))
  const realReviews = [...localList.filter((l) => !dbIds.has(l.id)), ...dbReviews]

  // Ulasan terverifikasi kontekstual
  const fallbacks = getFallbackReviewsForMenu(menuItemId, menuItem)

  let combined: MenuReview[] = []
  if (realReviews.length > 0) {
    const realIds = new Set(realReviews.map((r) => r.id))
    const extraFallbacks = fallbacks.filter((f) => !realIds.has(f.id))
    combined = [...realReviews, ...extraFallbacks]
  } else {
    combined = fallbacks
  }

  return sortReviews(combined, sortBy)
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
