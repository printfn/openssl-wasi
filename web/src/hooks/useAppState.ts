import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseBase64, toBase64 } from '../lib/base64';

export type AppState = {
	file: Uint8Array;
	command: string;
};

export function useAppState(defaultCommand: string) {
	const [searchParams, setSearchParams] = useSearchParams();
	const setField = useCallback(
		(key: keyof AppState, value: string) => {
			setSearchParams(
				prev => {
					prev.set(key, value.toString());
					return prev;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);
	const file = useMemo(
		() => parseBase64(searchParams.get('file') ?? ''),
		[searchParams],
	);
	const command = useMemo(
		() => searchParams.get('command') ?? defaultCommand,
		[searchParams, defaultCommand],
	);
	const setFile = useCallback(
		(file: Uint8Array) => {
			setField('file', toBase64(file));
		},
		[setField],
	);
	const setCommand = useCallback(
		(command: string) => {
			setField('command', command);
		},
		[setField],
	);
	return { file, setFile, command, setCommand };
}
