import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ReactCompilerConfig = {};

export default defineConfig({
	base: '/openssl-wasi/',
	build: {
		target: 'esnext',
		sourcemap: true,
	},
	plugins: [
		react({
			babel: {
				plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
			},
		}),
	],
});
