/**
 * محاكاة واجهة Cloudflare D1 فوق node:sqlite.
 *
 * تُستخدم في:
 *  1) توليد SQL الخاص بجداول Better Auth (scripts/generate-auth-migration.mjs)
 *  2) اختبارات التكامل (tests/integration) لتشغيل كود الـ Worker الحقيقي
 *     مقابل قاعدة SQLite في الذاكرة بدل قاعدة وهمية.
 *
 * ليست جزءاً من كود الإنتاج ولا تُرفع إلى Cloudflare.
 */
import { DatabaseSync } from 'node:sqlite';

class D1PreparedStatement {
  #db;

  constructor(db, sql, params = []) {
    this.#db = db;
    this.sql = sql;
    this.params = params;
  }

  get db() {
    return this.#db;
  }

  bind(...params) {
    return new D1PreparedStatement(this.#db, this.sql, params);
  }

  #normalize(params) {
    return params.map((value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'bigint') return value;
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    });
  }

  async all() {
    const statement = this.#db.prepare(this.sql);
    const params = this.#normalize(this.params);
    try {
      // عبارات القراءة — وكذلك أي عبارة كتابة تنتهي بـ RETURNING —
      // يجب أن تُنفَّذ بـ all() لأنها تُرجع صفوفاً.
      if (/^\s*(select|pragma|with)/i.test(this.sql) || /\breturning\b/i.test(this.sql)) {
        const results = statement.all(...params);
        return { success: true, results, meta: { changes: 0, last_row_id: 0, duration: 0 } };
      }
      const info = statement.run(...params);
      return {
        success: true,
        results: [],
        meta: {
          changes: Number(info.changes ?? 0),
          last_row_id: Number(info.lastInsertRowid ?? 0),
          duration: 0,
        },
      };
    } catch (error) {
      // D1 الحقيقي يرمي عند فشل الاستعلام؛ نحاكي ذلك حتى لا تُبتلع الأخطاء.
      throw new Error(`D1 shim query failed: ${error?.message ?? error}\nSQL: ${this.sql}`);
    }
  }

  async run() {
    return this.all();
  }

  async first(column) {
    const result = await this.all();
    if (!result.success) throw new Error(result.error);
    const row = result.results[0];
    if (!row) return null;
    return column ? (row[column] ?? null) : row;
  }

  async raw() {
    const result = await this.all();
    return result.results.map((row) => Object.values(row));
  }
}

export class D1SqliteShim {
  // حقل خاص (#) مقصود: Better Auth يكتشف نوع القاعدة عبر خصائص الكائن،
  // ووجود خاصية عامة باسم "db" يجعله يظنّ أننا نمرّر Kysely جاهزاً.
  #db;

  constructor(filename = ':memory:') {
    this.#db = new DatabaseSync(filename);
    this.#db.exec('PRAGMA foreign_keys = ON;');
  }

  prepare(sql) {
    return new D1PreparedStatement(this.#db, sql);
  }

  async exec(sql) {
    this.#db.exec(sql);
    return { count: sql.split(';').filter((s) => s.trim()).length, duration: 0 };
  }

  async batch(statements) {
    const out = [];
    for (const statement of statements) out.push(await statement.all());
    return out;
  }

  async dump() {
    throw new Error('dump() غير مدعوم في المحاكاة.');
  }

  close() {
    this.#db.close();
  }
}
