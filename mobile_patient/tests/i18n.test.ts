/// <reference types="node" />
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { translations } from '../src/locales'
import { translateIn, type LocaleModule, type TranslationTree } from '../src/locales/translate'

function flatten(tree: TranslationTree, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      result[path] = value
    } else {
      Object.assign(result, flatten(value, path))
    }
  }
  return result
}

const placeholders = (value: string) => (value.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort()

describe('translations', () => {
  const en = flatten(translations.en)
  const rw = flatten(translations.rw)
  const fr = flatten(translations.fr)

  it('has the same keys in every language', () => {
    const enKeys = Object.keys(en).sort()
    assert.deepEqual(Object.keys(rw).sort(), enKeys, 'rw keys differ from en')
    assert.deepEqual(Object.keys(fr).sort(), enKeys, 'fr keys differ from en')
    assert.ok(enKeys.length > 400, `only ${enKeys.length} keys`)
  })

  it('keeps the same placeholders in every language', () => {
    for (const [key, value] of Object.entries(en)) {
      assert.deepEqual(placeholders(rw[key] ?? ''), placeholders(value), `rw placeholders for ${key}`)
      assert.deepEqual(placeholders(fr[key] ?? ''), placeholders(value), `fr placeholders for ${key}`)
    }
  })

  it('has no empty strings', () => {
    for (const table of [en, rw, fr]) {
      for (const [key, value] of Object.entries(table)) {
        assert.ok(value.trim().length > 0, `empty string for ${key}`)
      }
    }
  })
})

describe('translateIn', () => {
  const tables: LocaleModule = {
    en: { a: { hello: 'Hello {{name}}', item_one: '{{count}} item', item_other: '{{count}} items', onlyEn: 'English' } },
    rw: { a: { hello: 'Muraho {{name}}' } },
    fr: {},
  }

  it('interpolates, pluralizes and falls back', () => {
    assert.equal(translateIn(tables, 'rw', 'a.hello', { name: 'Ana' }), 'Muraho Ana')
    assert.equal(translateIn(tables, 'en', 'a.item', { count: 1 }), '1 item')
    assert.equal(translateIn(tables, 'en', 'a.item', { count: 3 }), '3 items')
    assert.equal(translateIn(tables, 'rw', 'a.onlyEn'), 'English')
    assert.equal(translateIn(tables, 'fr', 'missing.key'), 'missing.key')
  })
})
