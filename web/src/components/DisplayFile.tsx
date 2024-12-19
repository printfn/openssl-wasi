import type { ReactNode } from 'react';
import { addLineBreaks } from '../lib/utils';
import { File } from '../lib/openssl';
import { Button } from 'react-bootstrap';

function isBinary(file: Uint8Array) {
	for (let i = 0; i < file.length; ++i) {
		if (file[i] === 10 || file[i] === 13 || file[i] === 9) {
			continue;
		}
		if (file[i] <= 31 || file[i] >= 127) {
			return true;
		}
	}
	return false;
}

export default function DisplayFile({ file }: { file: File }): ReactNode {
	const elem = isBinary(file.contents) ? (
		<>
			<span style={{ fontStyle: 'italic' }}>
				This file contains non-printable characters.
				<br />
				Rendering as base64:
				<br />
				<br />
			</span>
			{addLineBreaks(file.base64)}
		</>
	) : (
		new TextDecoder().decode(file.contents)
	);

	const fileLength = `${file.contents.length.toLocaleString()} bytes`;

	return (
		<div>
			<pre>{elem}</pre>
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
