import {
	type ChangeEvent,
	startTransition,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { parseBase64, toBase64 } from '../lib/base64';
import { SafeTextArea } from './SafeTextArea';
import { addLineBreaks, isBinary } from '../lib/utils';
import { Tab, Tabs } from 'react-bootstrap';
import { fromHex, toHex } from '../lib/hex';

type Props = {
	file: Uint8Array;
	setFile: (value: Uint8Array) => void;
};

export default function InputFile({ file, setFile }: Props) {
	const binary = useMemo(() => isBinary(file), [file]);
	const [activeKey, setActiveKey] = useState('utf8');

	const decodeFile = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const files = e.currentTarget.files;
			startTransition(async () => {
				if (!files?.[0]) {
					setFile(new Uint8Array());
					return;
				}

				setFile(new Uint8Array(await files[0].arrayBuffer()));
			});
		},
		[setFile],
	);

	return (
		<div>
			<Tabs
				activeKey={activeKey}
				onSelect={e => {
					setActiveKey(e ?? 'utf8');
				}}
			>
				<Tab eventKey="utf8" title="UTF-8" disabled={binary}>
					<SafeTextArea
						style={{ width: '100%', height: '10rem', fontFamily: 'monospace' }}
						onChange={e => {
							setFile(new TextEncoder().encode(e.currentTarget.value));
						}}
						value={new TextDecoder().decode(file)}
					/>
				</Tab>
				<Tab eventKey="base64" title="Base64">
					<SafeTextArea
						style={{ width: '100%', height: '10rem', fontFamily: 'monospace' }}
						onChange={e => {
							setFile(parseBase64(e.currentTarget.value));
						}}
						value={addLineBreaks(toBase64(file))}
					/>
				</Tab>
				<Tab eventKey="hex" title="Hex">
					<SafeTextArea
						style={{ width: '100%', height: '10rem', fontFamily: 'monospace' }}
						onChange={e => {
							setFile(fromHex(e.currentTarget.value));
						}}
						value={addLineBreaks(toHex(file))}
					/>
				</Tab>
			</Tabs>
			<input type="file" onChange={decodeFile} />
		</div>
	);
}
