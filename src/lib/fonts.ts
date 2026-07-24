import type { FontOption } from '../types'

/**
 * Curated caption fonts. These are all loaded in index.html.
 * Grouping reflects common best-practice for each content style:
 *  - UGC / viral: heavy, condensed, high-impact display faces
 *  - VSL: clean, trustworthy, highly legible sans faces
 *  - Ads: modern, friendly, brandable geometric sans faces
 */
export const FONTS: FontOption[] = [
  // ---- UGC / viral (Hormozi-style, bold & punchy) ----
  { label: 'Anton', value: 'Anton', weight: 400, category: 'UGC' },
  { label: 'Bebas Neue', value: 'Bebas Neue', weight: 400, category: 'UGC' },
  { label: 'Archivo Black', value: 'Archivo Black', weight: 400, category: 'UGC' },
  { label: 'Luckiest Guy', value: 'Luckiest Guy', weight: 400, category: 'UGC' },
  { label: 'Bangers', value: 'Bangers', weight: 400, category: 'UGC' },
  { label: 'Montserrat Black', value: 'Montserrat', weight: 900, category: 'UGC' },

  // ---- VSL (clean, authoritative, legible) ----
  { label: 'Inter', value: 'Inter', weight: 800, category: 'VSL' },
  { label: 'Roboto', value: 'Roboto', weight: 900, category: 'VSL' },
  { label: 'Oswald', value: 'Oswald', weight: 700, category: 'VSL' },
  { label: 'Poppins', value: 'Poppins', weight: 700, category: 'VSL' },

  // ---- Ads (modern, friendly, brandable) ----
  { label: 'Poppins Bold', value: 'Poppins', weight: 800, category: 'Ads' },
  { label: 'Rubik', value: 'Rubik', weight: 800, category: 'Ads' },
  { label: 'Nunito', value: 'Nunito', weight: 900, category: 'Ads' },
  { label: 'Fredoka', value: 'Fredoka', weight: 700, category: 'Ads' },
]

export const FONT_CATEGORIES = ['UGC', 'VSL', 'Ads'] as const
