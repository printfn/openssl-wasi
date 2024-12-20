import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { addLineBreaks, isBinary } from '../lib/utils';
import type { File } from '../lib/openssl';
import { Button, Tab, Tabs } from 'react-bootstrap';

export default function OutputFile({ file }: { file: File }): ReactNode {
	const binary = useMemo(() => isBinary(file.contents), [file.contents]);
	const [activeKey, setActiveKey] = useState('utf8');
	useEffect(() => {
		if (activeKey === 'utf8' && binary) {
			setActiveKey('base64');
		}
	}, [activeKey, binary]);

	const fileLength = `${file.contents.length.toLocaleString()} bytes`;

	return (
		<div>
			<Tabs
				activeKey={activeKey}
				onSelect={e => {
					setActiveKey(e ?? 'utf8');
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
