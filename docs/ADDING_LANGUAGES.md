# Adding a New Language

The app uses a lightweight custom i18n system (no external libraries). All translation infrastructure lives in `apps/frontend/i18n/`.

## Steps

### 1. Create the translation file

Copy `apps/frontend/i18n/en.json` to a new file named with the locale code, e.g. `de.json` for German:

```bash
cp apps/frontend/i18n/en.json apps/frontend/i18n/de.json
```

Translate all values in the new file. Keys must stay the same — only change the values. Any missing keys automatically fall back to English.

### 2. Register the locale

In `apps/frontend/i18n/index.tsx`, import the new file and add it to both `translations` and `LOCALES`:

```diff
 import en from './en.json';
 import bg from './bg.json';
+import de from './de.json';

-const translations = { en, bg } as const;
+const translations = { en, bg, de } as const;

 export const LOCALES: { value: Locale; label: string }[] = [
   { value: 'en', label: 'EN' },
   { value: 'bg', label: 'BG' },
+  { value: 'de', label: 'DE' },
 ];
```

The `Locale` type is derived automatically from `translations`, so TypeScript picks up the new locale with no extra work.

### 3. Add locale-aware formatting (optional)

If the new locale needs specific number/date formatting, add a mapping in `apps/frontend/lib/utils.ts`:

```diff
-const LOCALE_MAP: Record<string, string> = { en: 'en-GB', bg: 'bg-BG' };
+const LOCALE_MAP: Record<string, string> = { en: 'en-GB', bg: 'bg-BG', de: 'de-DE' };
```

This controls how `formatCurrency()` and `formatDate()` render numbers and dates. If omitted, it defaults to `en-GB`.

### 4. Add font subset (if needed)

If the language uses a script not covered by `latin` or `cyrillic`, add the subset in `apps/frontend/app/layout.tsx`:

```typescript
const inter = Inter({ subsets: ['latin', 'cyrillic', 'greek'] });
```

Available subsets for Inter: `latin`, `latin-ext`, `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`, `vietnamese`.

### 5. Build and test

```bash
pnpm --filter frontend build
```

Run the app, open Settings in the sidebar, and switch to the new language.

## How it works

- `LanguageProvider` (React Context) wraps the entire app and provides `locale`, `setLocale`, and `t()`
- `useTranslation()` hook gives any client component access to `t('key')` for translations
- Language preference is saved in `localStorage('locale')` and persists across sessions
- `document.documentElement.lang` is updated on locale change, which drives `Intl`-based formatting
- Translation keys use domain prefixes: `common.save`, `nav.dashboard`, `assets.form.name`, etc.
- Dynamic values use `{{var}}` interpolation: `t('dashboard.greeting', { name: 'Alex' })`

## What stays untranslated

- Currency codes (EUR, USD, BGN)
- Route paths (/dashboard, /assets)
- Backend API error messages
- User-entered data (asset names, descriptions)
- Recharts data keys (used as object property keys internally)
