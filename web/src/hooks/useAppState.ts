import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { fromBase64Url, toBase64Url } from '../lib/base64';

export type AppState = {
	files: { [name: string]: Uint8Array };
	command: string;
};

function encodeState(state: AppState) {
	return toBase64Url(
		new TextEncoder().encode(
			JSON.stringify({
				files: Object.fromEntries(
					Object.entries(state.files).map(([k, v]) => [k, toBase64Url(v)]),
				),
				command: state.command,
			}),
		),
	);
}

function decodeState(value: string | null): AppState {
	if (!value) {
		return {
			command: 'openssl x509 -in input_file -inform PEM -text -noout',
			files: { input_file: new Uint8Array() },
		};
	}
	type JsonState = { command: string; files: { [name: string]: string } };
	const jsonState = JSON.parse(
		new TextDecoder().decode(fromBase64Url(value)),
	) as JsonState;
	return {
		command: jsonState.command,
		files: Object.fromEntries(
			Object.entries(jsonState.files).map(([k, v]) => [k, fromBase64Url(v)]),
		),
	};
}

export function useAppState() {
	const [searchParams, setSearchParams] = useSearchParams();
	const state = useMemo(
		() => decodeState(searchParams.get('state')),
		[searchParams],
	);
	const setState = useCallback(
		(value: AppState) => {
			setSearchParams(
				prev => {
					prev.set('state', encodeState(value));
					return prev;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);
	return { state, setState };
}
