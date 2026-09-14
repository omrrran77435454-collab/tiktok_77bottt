/**
 * يولّد SQL الخاص بجداول Better Auth انطلاقاً من تعريف Better Auth نفسه،
 * بدل كتابتها يدوياً (حتى لا تنحرف عن ما يتوقّعه المكتبة).
 *
 * التشغيل:  node scripts/generate-auth-migration.mjs
 */
import { getMigrations } from 'better-auth/db/migration';
import { D1SqliteShim } from './d1-sqlite-shim.mjs';
import { authOptionsForMigration } from './auth-options.mjs';

const shim = new D1SqliteShim(':memory:');
const { compileMigrations } = await getMigrations(authOptionsForMigration(shim));
const sql = await compileMigrations();
console.log(sql);
shim.close();
