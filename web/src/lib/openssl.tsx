import { parse } from 'shell-quote';
import { ReactElement } from 'react';
import { instantiate } from '../assets/openssl-wasi/openssl';
import * as wasip2 from '@bytecodealliance/preview2-shim';
import { Descriptor } from '@bytecodealliance/preview2-shim/interfaces/wasi-filesystem-types';
import { Result } from '@bytecodealliance/preview2-shim/interfaces/wasi-cli-exit';
import { toBase64 } from '../base64';

export type File = { name: string; contents: Uint8Array; base64: string };

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

export async function execute(
	cmd: string,
	file: Uint8Array,
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
	preopens[0][0]
		.openAt({}, 'input_file', { create: true }, { write: true })
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		.write(new Uint8Array(file), 0);
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
			'wasi:cli/stdin': wasip2.cli.stdin,
			'wasi:cli/stdout': {
				getStdout: () => outStream,
			},
			'wasi:cli/terminal-input': wasip2.cli.terminalInput,
			'wasi:cli/terminal-output': wasip2.cli.terminalOutput,
			'wasi:cli/terminal-stderr': wasip2.cli.terminalStderr,
			'wasi:cli/terminal-stdin': wasip2.cli.terminalStdin,
			'wasi:cli/terminal-stdout': wasip2.cli.terminalStdout,
			'wasi:clocks/monotonic-clock': wasip2.clocks.monotonicClock,
			'wasi:clocks/wall-clock': wasip2.clocks.wallClock,
			'wasi:filesystem/preopens': {
				getDirectories: () => preopens,
			},
			'wasi:filesystem/types': wasip2.filesystem.types,
			'wasi:io/error': wasip2.io.error,
			'wasi:io/poll': wasip2.io.poll,
			'wasi:io/streams': wasip2.io.streams,
			'wasi:random/random': wasip2.random.random,
			'wasi:sockets/network': wasip2.sockets.network,
			'wasi:sockets/tcp': wasip2.sockets.tcp,
			'wasi:sockets/udp': wasip2.sockets.udp,
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

	const files: File[] = [];
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
		files.push({
			name: file.name,
			contents,
			base64: await toBase64(contents),
		});
	}
	files.sort((a, b) => a.name.localeCompare(b.name));

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
