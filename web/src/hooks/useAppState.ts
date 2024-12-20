import { startTransition, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fromBase64Url, toBase64Url } from '../lib/base64';
import { encode as cborEncode } from 'cbor2/encoder';
import { decode as cborDecode } from 'cbor2/decoder';

export type AppState = {
	files: Map<string, Uint8Array>;
	command: string;
};

async function compress(data: Uint8Array) {
	const ds = new CompressionStream('gzip');
	const blob = new Blob([data]);
	const decompressedStream = blob.stream().pipeThrough(ds);
	return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
}

async function decompress(data: Uint8Array) {
	const ds = new DecompressionStream('gzip');
	const blob = new Blob([data]);
	const decompressedStream = blob.stream().pipeThrough(ds);
	return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
}

async function encodeState(state: AppState) {
	const cborEncoded = cborEncode({
		c: state.command,
		f: Object.fromEntries(state.files.entries()),
	});
	return toBase64Url(await compress(cborEncoded));
}

const defaultState: AppState = {
	command: 'openssl x509 -in input_file -inform PEM -text -noout',
	files: new Map([['input_file', new Uint8Array()]]),
};

async function decodeState(value: string | null): Promise<AppState> {
	if (!value) {
		return defaultState;
	}
	try {
		type CborState = { c: string; f: { [name: string]: Uint8Array } };
		const cborState = cborDecode<CborState>(
			await decompress(fromBase64Url(value)),
		);
		return {
			command: cborState.c,
			files: new Map(Object.entries(cborState.f)),
		};
	} catch (e) {
		console.error('failed to decode state', e);
		return defaultState;
	}
}

export function useAppState() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [state, setStateInternal] = useState<AppState>(defaultState);
	useEffect(() => {
		startTransition(async () => {
			setStateInternal(await decodeState(searchParams.get('s')));
		});
	}, [searchParams]);
	const setState = useCallback(
		(value: AppState) => {
			startTransition(async () => {
				const encodedState = await encodeState(value);
				setSearchParams(
					prev => {
						prev.set('s', encodedState);
						return prev;
					},
					{ replace: true },
				);
			});
		},
		[setSearchParams],
	);
	return { state, setState };
}
