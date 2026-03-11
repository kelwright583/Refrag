# Refrag brand fonts: Inter & Anek Bangla (subtitles)

Brand typography:
- **All text:** Inter  
- **Subtitles:** Anek Bangla Expanded  

The codebase is already set up to use these. Below is how to get the fonts for design tools, local use, and the apps.

---

## 1. Web app (Next.js)

The **web-app** already loads the fonts via Next.js:

- **Inter** and **Anek Bangla** are loaded from Google Fonts at build time (`next/font/google` in `web-app/src/app/layout.tsx`).
- No extra steps: run the web app and the fonts will be used.
- **Subtitle style:** use the `font-subtitle` Tailwind class (e.g. `<h2 className="font-subtitle text-xl">...</h2>`).

---

## 2. Mobile app (Expo / React Native)

The **mobile-app** is configured to use Inter and Anek Bangla:

- **Installed:** `expo-font`, `@expo-google-fonts/inter`, `@expo-google-fonts/anek-bangla`.
- **Root layout** (`app/_layout.tsx`): loads Inter (400, 500, 600, 700) and Anek Bangla (400, 500, 600, 700) via `useFonts` from `expo-font`, shows a loading state until fonts are ready, then renders the app.
- **Theme** (`src/lib/theme/typography.ts`): uses `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` for body/headings and `AnekBangla_400Regular` (and other weights) for subtitles. Use `typography.fonts.body`, `typography.fontFamilyForWeight[typography.weights.bold]`, or `typography.fonts.subtitle` in your styles.
- **Components:** Shared components (modals, cards, Toast, ErrorBoundary, etc.) and login/org-select use these font families. For new screens, add `fontFamily: typography.fonts.body` or the appropriate weight so text uses Inter/Anek Bangla.

### Option B: Self-hosted font files

1. Download the font files:
   - **Inter:** https://fonts.google.com/specimen/Inter (download family, then take the `.ttf` files you need).
   - **Anek Bangla:** https://fonts.google.com/specimen/Anek+Bangla (download; “Expanded” is a width variant if available in the family).
2. Put the `.ttf` (or `.otf`) files in the mobile app, e.g. `mobile-app/assets/fonts/`.
3. Load them with `expo-font`’s `loadAsync` (e.g. `Font.loadAsync({ 'Inter': require('./assets/fonts/Inter-Regular.ttf') })`).
4. Use the same font family names in your theme/typography (e.g. `'Inter'`, `'Anek Bangla Expanded'`) so your existing `typography` config applies.

---

## 3. Design tools (Figma, etc.)

- **Inter**  
  - Google Fonts: https://fonts.google.com/specimen/Inter  
  - Download the family and install on your machine (e.g. double‑click the `.ttf` files), or use the “Download family” link and install from the zip.

- **Anek Bangla (for “Anek Bangla Expanded”)**  
  - Google Fonts: https://fonts.google.com/specimen/Anek+Bangla  
  - Download the family; if “Expanded” is listed as a width/style, install that variant.  
  - If only “Anek Bangla” is available (no separate “Expanded”), use that; the variable font may include an “Expanded” axis in supporting apps.

After installation they will appear in Figma (and other apps) in your system font list.

---

## 4. Quick reference

| Use case        | Inter | Anek Bangla (subtitles) |
|----------------|-------|---------------------------|
| Web app        | Loaded via `next/font` | Loaded via `next/font`; use class `font-subtitle` |
| Mobile app     | Load with `@expo-google-fonts/inter` + `expo-font` | Load with `@expo-google-fonts/anek-bangla` |
| Design (Figma) | Install from Google Fonts | Install from Google Fonts (use Expanded if available) |

If “Anek Bangla Expanded” is not a separate font in Google Fonts, use **Anek Bangla** and, in variable-font–aware apps, select the **Expanded** width axis if available.
