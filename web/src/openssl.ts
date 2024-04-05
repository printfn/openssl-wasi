import { init, MemFS, WASI } from "@wasmer/wasi";
import opensslURL from "./assets/openssl.wasm?url";

await init();

export async function execute(args: string[], file: Uint8Array) {
	const fs = new MemFS();
	fs.open("inputfile", { create: true, write: true }).write(file);
	fs.open("openssl.cnf", { create: true, write: true }).write(new Uint8Array());
	const wasi = new WASI({ env: { 'OPENSSL_CONF': '/openssl.cnf' }, args: ["openssl", ...args], fs });

	const moduleBytes = fetch(opensslURL);
	const module = await WebAssembly.compileStreaming(moduleBytes);
	// Instantiate the WASI module
	await wasi.instantiate(module, {});

	// Run the start function
	const exitCode = wasi.start();
	const stdout = wasi.getStdoutString();
	const stderr = wasi.getStderrString();

	return `${stdout}\n${stderr}\nExit code: ${exitCode}`;
}
