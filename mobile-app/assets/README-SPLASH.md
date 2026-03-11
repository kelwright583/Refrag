# Screen before the custom splash (native splash)

The **first** screen you see when opening the app (before the REFRAG splash) is the **native splash**. It shows only the doc icon (no REFRAG text).

- **Asset used:** `doc-icon-splash.png` in this folder.
- **To update it:** Replace `doc-icon-splash.png` with your doc icon image (same format: PNG, no REFRAG text). You can also overwrite it by copying from `src/components/brand/RefragDocIcon.png` if that’s your source of truth.

**If the old image still appears after replacing the file:**

1. Clear Metro cache and restart:  
   `npx expo start -c`
2. If you use a development build (not Expo Go), the native splash is embedded at build time. Regenerate and run:
   - `npx expo prebuild --clean`
   - then `npx expo run:ios` or `npx expo run:android`

Expo Go and dev builds can cache the splash; a **preview or production build** shows the actual splash most reliably.
