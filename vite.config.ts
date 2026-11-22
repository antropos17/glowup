import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Сборка в один HTML-файл: его можно открыть по ссылке на телефоне
// и позже положить внутрь Capacitor без изменений.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  build: { target: 'es2022', assetsInlineLimit: 100_000_000, cssCodeSplit: false },
});
