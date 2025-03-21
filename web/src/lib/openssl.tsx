/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'shell-quote';
import type { ReactElement } from 'react';
import { instantiate } from '../assets/openssl-wasi/openssl';
import * as wasip2 from '@bytecodealliance/preview2-shim';
import type { Descriptor } from '@bytecodealliance/preview2-shim/interfaces/wasi-filesystem-types';
import type { Result } from '@bytecodealliance/preview2-shim/interfaces/wasi-cli-exit';
import { toBase64 } from './base64';
import { toHex } from './hex';
import { AsyncLock } from './async-lock';

type InputFiles = Map<string, Uint8Array>;

export type File = {
	name: string;
	contents: Uint8Array;
	base64: string;
	hex: string;
};

export type OpenSSLResult = {
	output: ReactElement;
	files?: File[];
};

const textDecoder = new TextDecoder();

class ExitError extends Error {
	statusCode: number;
	constructor(statusCode: number) {
		super('exit error');
		this.statusCode = statusCode;
	}
}

async function executeInternal(
	cmd: string,
	inputFiles: InputFiles,
): Promise<OpenSSLResult> {
	const parsed = parse(cmd);
	const args: string[] = [];
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
	if (args.length === 0) {
		return {
			output: <span style={{ color: 'red' }}>no command specified</span>,
		};
	}
	console.log('Running command', args);
	const preopens: [Descriptor, string][] = [
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		[new wasip2.filesystem.types.Descriptor({ dir: {} }), '/'],
	];
	preopens[0][0]
		.openAt({}, 'openssl.cnf', { create: true }, { write: true })
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		.write(new Uint8Array([]), 0);
	for (const [name, contents] of inputFiles) {
		preopens[0][0]
			.openAt({}, name, { create: true }, { write: true })
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			.write(new Uint8Array(contents), 0);
	}
	let stdout = '';
	let stderr = '';
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	const outStream = new wasip2.io.streams.OutputStream({
		write(contents: Uint8Array) {
			stdout += textDecoder.decode(contents);
		},
		blockingFlush() {},
		[Symbol.dispose]() {},
	});
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	const errStream = new wasip2.io.streams.OutputStream({
		write(contents: Uint8Array) {
			stderr += textDecoder.decode(contents);
		},
		blockingFlush() {},
		[Symbol.dispose]() {},
	});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const wasi: any = wasip2;
	// eslint-disable-next-line @typescript-eslint/await-thenable
	const { run } = await instantiate(
		async url => {
			const response = await fetch(
				new URL(`../assets/openssl-wasi/${url}`, import.meta.url),
			);
			return await WebAssembly.compileStreaming(response);
		},
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		{
			'wasi:cli/environment': {
				getArguments: () => args,
				getEnvironment: () => [['OPENSSL_CONF', '/openssl.cnf']],
			},
			'wasi:cli/exit': {
				exit: (r: Result<void, void>) => {
					throw new ExitError(r.tag === 'err' ? 1 : 0);
				},
			},
			'wasi:cli/stderr': {
				getStderr: () => errStream,
			},
			'wasi:cli/stdin': wasi.cli.stdin,
			'wasi:cli/stdout': {
				getStdout: () => outStream,
			},
			'wasi:cli/terminal-input': wasi.cli.terminalInput,
			'wasi:cli/terminal-output': wasi.cli.terminalOutput,
			'wasi:cli/terminal-stderr': wasi.cli.terminalStderr,
			'wasi:cli/terminal-stdin': wasi.cli.terminalStdin,
			'wasi:cli/terminal-stdout': wasi.cli.terminalStdout,
			'wasi:clocks/monotonic-clock': wasi.clocks.monotonicClock,
			'wasi:clocks/wall-clock': wasi.clocks.wallClock,
			'wasi:filesystem/preopens': {
				getDirectories: () => preopens,
			},
			'wasi:filesystem/types': wasi.filesystem.types,
			'wasi:io/error': wasi.io.error,
			'wasi:io/poll': wasi.io.poll,
			'wasi:io/streams': wasi.io.streams,
			'wasi:random/random': wasi.random.random,
			'wasi:sockets/network': wasi.sockets.network,
			'wasi:sockets/tcp': wasi.sockets.tcp,
			'wasi:sockets/udp': wasi.sockets.udp,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any,
	);
	let exitCode = 0;
	try {
		run.run();
	} catch (e: unknown) {
		if (e instanceof ExitError) {
			exitCode = e.statusCode;
		} else {
			console.error(e);
		}
	}

	const outputFiles: File[] = [];
	const directory = preopens[0][0].readDirectory();
	for (let file = null; (file = directory.readDirectoryEntry()); ) {
		if (
			!file.name ||
			file.name === 'input_file' ||
			file.name === 'openssl.cnf'
		) {
			continue;
		}
		const [contents] = preopens[0][0]
			.openAt({}, file.name, {}, { read: true })
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			.read(10000000, 0);
		if (contents.length === 0) {
			continue;
		}
		outputFiles.push({
			name: file.name,
			contents,
			base64: toBase64(contents),
			hex: toHex(contents),
		});
	}
	outputFiles.sort((a, b) => a.name.localeCompare(b.name));

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

	return { output, files: outputFiles };
}

const lock = new AsyncLock();
let cache:
	| { cmd: string; files: InputFiles; result: OpenSSLResult }
	| undefined;
function compareCache(cmd: string, files: InputFiles) {
	if (!cache || cache.cmd !== cmd) {
		return false;
	}
	if (cache.files.size !== files.size) {
		return false;
	}
	for (const [k, file] of files) {
		const cacheFile = cache.files.get(k);
		if (!cacheFile || file.length !== cacheFile.length) {
			return false;
		}
		if (!file.every((n, i) => cacheFile[i] === n)) {
			return false;
		}
	}
	return true;
}

export async function execute(
	cmd: string,
	files: InputFiles,
	options: { force: boolean },
): Promise<OpenSSLResult> {
	const release = await lock.acquire();
	try {
		if (!options.force && cache && compareCache(cmd, files)) {
			console.log('using cache', cache);
			return cache.result;
		}
		console.log('recalculating, cache:', cache, cmd);
		const result = await executeInternal(cmd, files);
		cache = { cmd, files, result };
		return result;
	} finally {
		release();
	}
}
