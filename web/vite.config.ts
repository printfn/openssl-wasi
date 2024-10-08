import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	base: '/openssl-wasi/',
	build: {
		target: 'esnext',
		sourcemap: true,
	},
	plugins: [react(), nodePolyfills({
		include: ['buffer'],
	})],
});
