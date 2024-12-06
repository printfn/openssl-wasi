import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ReactCompilerConfig = {};

export default defineConfig({
	base: '/openssl-wasi/',
	build: {
		minify: false,
		sourcemap: true,
		target: 'esnext',
	},
	plugins: [
		react({
			babel: {
				plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
			},
		}),
	],
});
