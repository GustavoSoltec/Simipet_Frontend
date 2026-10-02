import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
 
// Se lee la version directo de package.json (una sola fuente de verdad --
// nunca se escribe el numero a mano en dos lugares) y se expone como
// constante global __APP_VERSION__, disponible en el codigo del Sidebar
// sin tener que hacer un import de package.json en tiempo de ejecucion
// (Vite la reemplaza como texto literal al compilar).
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'));
 
// Configuracion base de Vite para Simipet.
// El servidor de desarrollo corre en el puerto 5174 por defecto (distinto
// al 5173 de Soltec 2.0) para poder tener ambos proyectos corriendo en
// paralelo en la misma maquina sin conflicto de puertos. El proxy de
// /api evita problemas de CORS contra el backend local durante desarrollo.
//
// "base" le dice a Vite que la app va a vivir en una subcarpeta del
// dominio (https://tudominio.com/simipet/), no en la raiz, para poder
// convivir con Soltec 2.0 (que vive en /soltec2/) en el mismo dominio.
// Si en algun momento Simipet pasa a un subdominio propio o a la raiz
// del dominio, este valor debe volver a '/'.
export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://api.simipet.soltecapps.net',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Los source maps quedan desactivados: el sitio ya vive en una
    // URL publica real, y con ellos activos cualquiera puede ver el
    // codigo fuente completo sin minificar (comentarios incluidos)
    // desde las herramientas de desarrollador del navegador.
    sourcemap: false,
  },
});
 
