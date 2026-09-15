// @vitest-environment node
/**
 * يثبت أن معرّف قاعدة D1 يصل إلى ملف الإعداد الذي يقرأه `wrangler deploy` فعلاً.
 *
 * الخطأ الذي يحرس منه هذا الملف:
 *   Binding DB of type d1 must have a valid database_id specified
 * سببه أن @cloudflare/vite-plugin يجمّد نسخة من الإعداد داخل dist أثناء البناء،
 * فيبقى فيها REPLACE_WITH_YOUR_D1_DATABASE_ID رغم تعديل wrangler.jsonc لاحقاً.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEPLOY_POINTER,
  isDatabaseId,
  readDatabaseIdFromGeneratedConfig,
  resolveGeneratedConfigPath,
  setDatabaseIdInGeneratedConfig,
  setDatabaseIdInSourceConfig,
  shortId,
  // @ts-expect-error — سكربت نشر بلا أنواع، يُستورد كما هو.
} from '../scripts/wrangler-config.mjs';

const PLACEHOLDER = 'REPLACE_WITH_YOUR_D1_DATABASE_ID';
const REAL_ID = '3f2a91c4-6b7d-4e18-9a05-c1de73f0b842';
const TARGET = { binding: 'DB', databaseName: 'teacher-tools-db' };

/** نسخة مبسّطة من الإعداد الذي تولّده الإضافة داخل dist/teacher_tools/wrangler.json. */
function generatedConfig(databaseId = PLACEHOLDER) {
  return JSON.stringify({
    name: 'teacher-tools',
    main: 'index.js',
    compatibility_date: '2026-09-01',
    assets: { binding: 'ASSETS', directory: '../client' },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'teacher-tools-db',
        database_id: databaseId,
        migrations_dir: '../../migrations',
      },
    ],
    observability: { enabled: true },
  });
}

describe('isDatabaseId', () => {
  it('يقبل UUID حقيقياً فقط', () => {
    expect(isDatabaseId(REAL_ID)).toBe(true);
    expect(isDatabaseId(REAL_ID.toUpperCase())).toBe(true);
  });

  it('يرفض الفارغ والقيمة النائبة وأي نص آخر', () => {
    expect(isDatabaseId('')).toBe(false);
    expect(isDatabaseId(PLACEHOLDER)).toBe(false);
    expect(isDatabaseId(undefined)).toBe(false);
    expect(isDatabaseId('3f2a91c4')).toBe(false);
  });
});

describe('shortId', () => {
  it('يطبع أول 8 أحرف فقط ولا يكشف المعرّف كاملاً', () => {
    const printed = shortId(REAL_ID);
    expect(printed).toBe('3f2a91c4…');
    expect(printed).not.toContain('c1de73f0b842');
  });
});

describe('setDatabaseIdInSourceConfig', () => {
  it('يستبدل القيمة النائبة داخل wrangler.jsonc', () => {
    const source = `{\n  // تعليق\n  "d1_databases": [{ "database_id": "${PLACEHOLDER}" }]\n}`;
    const result = setDatabaseIdInSourceConfig(source, REAL_ID);
    expect(result.changed).toBe(true);
    expect(result.text).toContain(REAL_ID);
    expect(result.text).not.toContain(PLACEHOLDER);
  });

  it('يبلّغ بعدم التغيير عندما يغيب حقل database_id', () => {
    const result = setDatabaseIdInSourceConfig('{ "name": "teacher-tools" }', REAL_ID);
    expect(result.changed).toBe(false);
  });
});

describe('setDatabaseIdInGeneratedConfig', () => {
  it('يحوّل القيمة النائبة في الإعداد المولَّد إلى المعرّف الحقيقي', () => {
    const before = generatedConfig();
    expect(readDatabaseIdFromGeneratedConfig(before, TARGET)).toBe(PLACEHOLDER);

    const { text, updated } = setDatabaseIdInGeneratedConfig(before, REAL_ID, TARGET);

    expect(updated).toBe(1);
    expect(readDatabaseIdFromGeneratedConfig(text, TARGET)).toBe(REAL_ID);
    expect(isDatabaseId(readDatabaseIdFromGeneratedConfig(text, TARGET))).toBe(true);
    expect(text).not.toContain(PLACEHOLDER);
  });

  it('يحافظ على باقي الحقول كما ولّدتها الإضافة', () => {
    const { text } = setDatabaseIdInGeneratedConfig(generatedConfig(), REAL_ID, TARGET);
    const config = JSON.parse(text);

    expect(config.name).toBe('teacher-tools');
    expect(config.main).toBe('index.js');
    expect(config.assets.directory).toBe('../client');
    expect(config.d1_databases[0].migrations_dir).toBe('../../migrations');
    expect(config.observability).toEqual({ enabled: true });
  });

  it('يطابق الـ binding عبر database_name حتى لو اختلف اسم الـ binding', () => {
    const config = JSON.stringify({
      d1_databases: [{ binding: 'OTHER', database_name: 'teacher-tools-db', database_id: '' }],
    });
    const { text } = setDatabaseIdInGeneratedConfig(config, REAL_ID, TARGET);
    expect(JSON.parse(text).d1_databases[0].database_id).toBe(REAL_ID);
  });

  it('يرفض معرّفاً غير صالح بدل كتابته', () => {
    expect(() => setDatabaseIdInGeneratedConfig(generatedConfig(), PLACEHOLDER, TARGET)).toThrow(
      /UUID/,
    );
    expect(() => setDatabaseIdInGeneratedConfig(generatedConfig(), '', TARGET)).toThrow(/UUID/);
  });

  it('يتوقّف برسالة واضحة عندما لا يوجد D1 binding مطابق', () => {
    const config = JSON.stringify({
      d1_databases: [{ binding: 'ANALYTICS', database_name: 'other-db', database_id: '' }],
    });
    expect(() => setDatabaseIdInGeneratedConfig(config, REAL_ID, TARGET)).toThrow(/ANALYTICS/);
  });

  it('يتوقّف عندما لا يحتوي الإعداد المولَّد أي d1_databases', () => {
    expect(() => setDatabaseIdInGeneratedConfig('{"name":"teacher-tools"}', REAL_ID, TARGET)).toThrow(
      /d1_databases/,
    );
  });

  it('يتوقّف عندما يكون الإعداد المولَّد غير صالح', () => {
    expect(() => setDatabaseIdInGeneratedConfig('{ not json', REAL_ID, TARGET)).toThrow(/JSON/);
  });
});

describe('resolveGeneratedConfigPath', () => {
  let cwd = '';

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'deploy-config-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  function writePointer(configPath: string) {
    mkdirSync(join(cwd, '.wrangler/deploy'), { recursive: true });
    writeFileSync(join(cwd, DEPLOY_POINTER), JSON.stringify({ configPath, auxiliaryWorkers: [] }));
  }

  it('يُرجع null قبل تنفيذ البناء (لا يوجد ملف تحويل)', () => {
    expect(resolveGeneratedConfigPath(cwd)).toBeNull();
  });

  it('يحلّ configPath النسبي انطلاقاً من مجلّد ملف التحويل', () => {
    mkdirSync(join(cwd, 'dist/teacher_tools'), { recursive: true });
    writeFileSync(join(cwd, 'dist/teacher_tools/wrangler.json'), generatedConfig());
    writePointer('../../dist/teacher_tools/wrangler.json');

    expect(resolveGeneratedConfigPath(cwd)).toBe(join(cwd, 'dist/teacher_tools/wrangler.json'));
  });

  it('يتوقّف عندما يشير configPath إلى ملف غير موجود', () => {
    writePointer('../../dist/teacher_tools/wrangler.json');
    expect(() => resolveGeneratedConfigPath(cwd)).toThrow(/غير موجود/);
  });

  it('يتوقّف عندما يغيب حقل configPath', () => {
    mkdirSync(join(cwd, '.wrangler/deploy'), { recursive: true });
    writeFileSync(join(cwd, DEPLOY_POINTER), JSON.stringify({ auxiliaryWorkers: [] }));
    expect(() => resolveGeneratedConfigPath(cwd)).toThrow(/configPath/);
  });

  /** السيناريو الكامل كما يحدث في GitHub Actions: بناء ← تعديل ← تحقّق. */
  it('ينقل المعرّف من السكربت إلى الملف الذي يقرأه wrangler deploy', () => {
    mkdirSync(join(cwd, 'dist/teacher_tools'), { recursive: true });
    const generatedPath = join(cwd, 'dist/teacher_tools/wrangler.json');
    writeFileSync(generatedPath, generatedConfig());
    writePointer('../../dist/teacher_tools/wrangler.json');

    // قبل: ما سيقرأه Wrangler هو القيمة النائبة — أي فشل مؤكّد.
    const beforeValue = readDatabaseIdFromGeneratedConfig(
      readFileSync(generatedPath, 'utf8'),
      TARGET,
    );
    expect(beforeValue).toBe(PLACEHOLDER);
    expect(isDatabaseId(beforeValue)).toBe(false);

    const resolved = resolveGeneratedConfigPath(cwd) as string;
    const { text } = setDatabaseIdInGeneratedConfig(
      readFileSync(resolved, 'utf8'),
      REAL_ID,
      TARGET,
    );
    writeFileSync(resolved, text);

    // بعد: التحقّق الذي يسبق النشر يمرّ لأن القيمة صارت UUID حقيقياً.
    const afterValue = readDatabaseIdFromGeneratedConfig(readFileSync(resolved, 'utf8'), TARGET);
    expect(afterValue).toBe(REAL_ID);
    expect(isDatabaseId(afterValue)).toBe(true);
  });
});
