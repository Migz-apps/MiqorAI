// Pure lookup helpers (no React Native imports) so they can be unit tested and
// used outside components without pulling in the store.
export type LanguageCode = 'en' | 'rw' | 'fr'
export type TranslationTree = { [key: string]: string | TranslationTree }
export type LocaleModule = Record<LanguageCode, TranslationTree>
export type TranslateParams = Record<string, string | number>

export const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'rw', 'fr']

function isTree(value: unknown): value is TranslationTree {
  return typeof value === 'object' && value !== null
}

export function deepMerge(target: TranslationTree, source: TranslationTree): TranslationTree {
  const result: TranslationTree = { ...target }
  for (const [key, value] of Object.entries(source)) {
    const existing = result[key]
    result[key] = isTree(existing) && isTree(value) ? deepMerge(existing, value) : value
  }
  return result
}

export function mergeLocales(modules: LocaleModule[]): LocaleModule {
  const merged: LocaleModule = { en: {}, rw: {}, fr: {} }
  for (const module of modules) {
    for (const language of SUPPORTED_LANGUAGES) {
      merged[language] = deepMerge(merged[language], module[language] ?? {})
    }
  }
  return merged
}

function lookupPath(tree: TranslationTree | undefined, path: string): string | undefined {
  let node: string | TranslationTree | undefined = tree
  for (const key of path.split('.')) {
    if (!isTree(node)) {
      return undefined
    }
    node = node[key]
  }
  return typeof node === 'string' && node.length > 0 ? node : undefined
}

function interpolate(template: string, params?: TranslateParams) {
  if (!params) {
    return template
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    params[name] != null ? String(params[name]) : match,
  )
}

// Resolves `path` in the requested language, falling back to English and then
// to the path itself. With a numeric `count` param, `<path>_one` / `<path>_other`
// are tried first.
export function translateIn(
  tables: LocaleModule,
  language: LanguageCode,
  path: string,
  params?: TranslateParams,
): string {
  const candidates =
    typeof params?.count === 'number' ? [`${path}_${params.count === 1 ? 'one' : 'other'}`, path] : [path]

  for (const table of [tables[language], tables.en]) {
    for (const candidate of candidates) {
      const value = lookupPath(table, candidate)
      if (value !== undefined) {
        return interpolate(value, params)
      }
    }
  }

  return path
}
