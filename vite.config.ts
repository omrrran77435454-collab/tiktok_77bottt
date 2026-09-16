import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  optimizeDeps: {
    // مكتبات التصدير تُحمَّل ديناميكياً عند أول تصدير. بدون تضمينها هنا،
    // يكتشفها Vite متأخّراً فيعيد تجميع الاعتماديات ويردّ 504 على أول طلب
    // (Outdated Optimize Dep) فيفشل التصدير الأول بعد تشغيل بارد للخادم.
    include: ['jspdf', 'html-to-image', 'firebase/app', 'firebase/auth'],
  },
  build: {
    // مجلد الإخراج يديره إضافة Cloudflare: dist/client للأصول
    // وdist/<worker-name> للـ Worker مع ملف إعداد جاهز للنشر.
    sourcemap: false,
    rollupOptions: {
      output: {
        // مكتبات التصدير ثقيلة نسبياً؛ نفصلها حتى لا تُحمَّل مع الصفحة الأولى.
        manualChunks(id: string) {
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html-to-image')) {
            return 'export-libs';
          }
          return undefined;
        },
      },
    },
  },
});
