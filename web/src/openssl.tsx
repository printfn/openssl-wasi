import { init, MemFS, WASI } from '@wasmer/wasi';
import opensslURL from './assets/openssl.wasm?url';
import { parse } from 'shell-quote';
import { ReactElement } from 'react';

await init();
const moduleBytes = fetch(opensslURL);
const module = await WebAssembly.compileStreaming(moduleBytes);

type File = { name: string; contents: Uint8Array };

export type OpenSSLResult = {
	output: ReactElement;
	files?: File[];
};

export async function execute(
	cmd: string,
	file: Uint8Array,
): Promise<OpenSSLResult> {
	const parsed = parse(cmd);
	const args = [];
	for (let i = 0; i < parsed.length; ++i) {
		const arg = parsed[i];
		if (typeof arg === 'string') {
			args.push(arg);
		} else {
			return {
				output: (
					<span style={{ color: 'red' }}>failed to parse command `{cmd}`</span>
				),
			};
		}
	}
	const fs = new MemFS();
	fs.open('input_file', { create: true, write: true }).write(file);
	fs.open('openssl.cnf', { create: true, write: true }).write(new Uint8Array());
	console.log('Running command', args);
	const wasi = new WASI({
		env: { OPENSSL_CONF: '/openssl.cnf' },
		args,
		fs,
	});

	// Instantiate the WASI module
	await wasi.instantiate(module, {});

	// Run the start function
	const exitCode = wasi.start();
	const stdout = wasi.getStdoutString();
	const stderr = wasi.getStderrString();
	const files: File[] = [];
	for (const file of wasi.fs.readDir('/')) {
		if (
			!file?.path ||
			file.path === '/input_file' ||
			file.path === '/openssl.cnf'
		) {
			continue;
		}
		const contents = wasi.fs.open(file.path, { read: true }).read();
		if (contents.length === 0) {
			continue;
		}
		files.push({
			name: file.path.slice(1),
			contents,
		});
	}
	files.sort((a, b) => a.name.localeCompare(b.name));
	wasi.free();

	const noOutput = stderr.trim().length === 0 && stdout.trim().length === 0;

	const output = (
		<>
			<span style={{ color: 'red' }}>{stderr}</span>
			{stdout}
			{noOutput ? (
				<span style={{ fontStyle: 'italic' }}>
					No output
					<br />
				</span>
			) : (
				''
			)}
			{exitCode !== 0 || noOutput ? (
				<>
					<br />
					Exit code: {exitCode}
				</>
			) : null}
		</>
	);

	return { output, files };
}
