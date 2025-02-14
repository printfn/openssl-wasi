import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { addLineBreaks, isBinary } from '../lib/utils';
import type { File } from '../lib/openssl';
import { Button, Tab, Tabs } from 'react-bootstrap';

const tabKeys = ['utf8', 'base64', 'hex'] as const;
type TabKey = (typeof tabKeys)[number];

function useTabKey(binary: boolean): [TabKey, (key: string | null) => void] {
	const [activeKeyInternal, setActiveKeyInternal] = useState<TabKey>('utf8');
	const activeKey = useMemo(
		() =>
			activeKeyInternal === 'utf8' && binary ? 'base64' : activeKeyInternal,
		[binary, activeKeyInternal],
	);
	const setActiveKey = useCallback((k: string | null) => {
		if (k && tabKeys.includes(k as TabKey)) {
			setActiveKeyInternal(k as TabKey);
		} else {
			setActiveKeyInternal('utf8');
		}
	}, []);
	return [activeKey, setActiveKey];
}

export default function OutputFile({ file }: { file: File }): ReactNode {
	const binary = useMemo(() => isBinary(file.contents), [file.contents]);
	const [activeKey, setActiveKey] = useTabKey(binary);

	const fileLength = `${file.contents.length.toLocaleString()} bytes`;

	return (
		<div>
			<Tabs
				activeKey={activeKey}
				onSelect={e => {
					setActiveKey((e as TabKey | null) ?? 'utf8');
				}}
			>
				<Tab eventKey="utf8" title="UTF-8" disabled={binary}>
					<pre>{new TextDecoder().decode(file.contents)}</pre>
				</Tab>
				<Tab eventKey="base64" title="Base64">
					<pre>{addLineBreaks(file.base64)}</pre>
				</Tab>
				<Tab eventKey="hex" title="Hex">
					<pre>{addLineBreaks(file.hex)}</pre>
				</Tab>
			</Tabs>
			<div className="mb-3">
				<a
					href={`data:application/octet-stream;base64,${file.base64}`}
					download={file.name}
				>
					<Button variant="secondary">
						<i className="fa-solid fa-download" /> {file.name} ({fileLength})
					</Button>
				</a>
			</div>
		</div>
	);
}
