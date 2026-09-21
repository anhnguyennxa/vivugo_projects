import { create } from 'zustand'

import { addFavorite, getFavorites, removeFavorite } from '@/services/favorites'

interface FavoritesState {
  ids: Set<string>
  loaded: boolean
  load: () => Promise<void>
  toggle: (tourId: string) => Promise<void>
  reset: () => void
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  load: async () => {
    try {
      const favorites = await getFavorites()
      set({ ids: new Set(favorites.map((f) => f.tourId)), loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  toggle: async (tourId: string) => {
    const { ids } = get()
    const isFavorited = ids.has(tourId)
    const next = new Set(ids)
    if (isFavorited) next.delete(tourId)
    else next.add(tourId)
    set({ ids: next })

    try {
      if (isFavorited) await removeFavorite(tourId)
      else await addFavorite(tourId)
    } catch {
      set({ ids })
    }
  },

  reset: () => set({ ids: new Set(), loaded: false }),
}))
