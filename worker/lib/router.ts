import type { Env } from '../env';
import { errors } from './http';

export interface RouteContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  url: URL;
}

export type RouteHandler = (context: RouteContext) => Response | Promise<Response>;

interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

/**
 * موجّه بسيط جداً (exact path matching) مكتوب داخل المشروع بدل إضافة مكتبة.
 * عدد المسارات محدود ولا نحتاج مطابقة أنماط معقّدة، لذلك هذا أبسط وأخف.
 */
export class Router {
  #routes: Route[] = [];
  /** بادئات تُمرَّر كاملة إلى معالج واحد (مثل مسارات Better Auth). */
  #prefixes: { method: '*'; prefix: string; handler: RouteHandler }[] = [];

  add(method: string, path: string, handler: RouteHandler): this {
    this.#routes.push({ method, path, handler });
    return this;
  }

  get(path: string, handler: RouteHandler) {
    return this.add('GET', path, handler);
  }

  post(path: string, handler: RouteHandler) {
    return this.add('POST', path, handler);
  }

  /** يلتقط كل الطلبات التي تبدأ بالبادئة المعطاة. */
  mount(prefix: string, handler: RouteHandler): this {
    this.#prefixes.push({ method: '*', prefix, handler });
    return this;
  }

  async handle(context: RouteContext): Promise<Response> {
    const { pathname } = context.url;

    for (const entry of this.#prefixes) {
      if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
        return entry.handler(context);
      }
    }

    let pathExists = false;
    for (const route of this.#routes) {
      if (route.path !== pathname) continue;
      pathExists = true;
      if (route.method === context.request.method) {
        return route.handler(context);
      }
    }

    if (pathExists) {
      return errors.badRequest('طريقة الطلب غير مدعومة لهذا المسار.');
    }
    return errors.notFound();
  }
}
