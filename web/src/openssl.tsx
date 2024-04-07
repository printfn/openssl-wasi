import { init, MemFS, WASI } from '@wasmer/wasi';
import opensslURL from './assets/openssl.wasm?url';
import { parse } from 'shell-quote';

await init();

export async function execute(cmd: string, file: Uint8Array) {
	const parsed = parse(cmd);
	const args = [];
	for (let i = 0; i < parsed.length; ++i) {
		const arg = parsed[i];
		if (typeof arg === 'string') {
			args.push(arg);
		} else {
			return <>failed to parse command `{cmd}`</>;
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

	const moduleBytes = fetch(opensslURL);
	const module = await WebAssembly.compileStreaming(moduleBytes);
	// Instantiate the WASI module
	await wasi.instantiate(module, {});

	// Run the start function
	const exitCode = wasi.start();
	const stdout = wasi.getStdoutString();
	const stderr = wasi.getStderrString();

	return (
		<>
			{stdout}
			<span style={{ color: 'red' }}>{stderr}</span>
			{exitCode !== 0 ? (
				<>
					<br />
					Exit code: {exitCode}
				</>
			) : null}
		</>
	);
}
