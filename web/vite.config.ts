import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
	base: '/openssl-wasi/',
	build: {
		target: 'esnext',
		sourcemap: true,
	},
	plugins: [react()],
});
