import { useCallback, useEffect, useState } from 'react';
import { execute } from './openssl';
import { Container } from 'react-bootstrap';
import { Buffer } from 'node:buffer';

type FileType = 'cert' | 'csr' | 'crl';

function getCommand(fileType: FileType, pem: boolean) {
	const fmt = pem ? 'PEM' : 'DER';
	switch (fileType) {
		case 'cert':
			return ['x509', '-in', 'inputfile', '-inform', fmt, '-text', '-noout'];
		case 'csr':
			return ['req', '-in', 'inputfile', '-inform', fmt, '-text', '-noout'];
		case 'crl':
			return ['crl', '-in', 'inputfile', '-inform', fmt, '-text', '-noout'];
		default:
			throw new Error('unknown file type ' + fileType);
	}
}

function App() {
	const [file, setFile] = useState(new Uint8Array());
	const [fileType, setFileType] = useState<FileType>('cert');
	const [pem, setPEM] = useState(true);
	const [decoded, setDecoded] = useState('');

	useEffect(() => {
		(async () => {
			const result = await execute(getCommand(fileType, pem), file);
			setDecoded(result);
		})();
	}, [file, pem, fileType]);

	const decodeFile = useCallback(
		(files: FileList | null) => {
			if (!files || !files[0]) {
				setFile(new Uint8Array());
				return;
			}

			(async () => {
				setFile(new Uint8Array(await files[0].arrayBuffer()));
			})();
		},
		[setFile],
	);

	return (
		<Container>
			<h1>Decode ASN1</h1>
			<textarea
				style={{ width: '100%', height: '10rem' }}
				onChange={e => setFile(new TextEncoder().encode(e.currentTarget.value))}
				value={
					pem
						? new TextDecoder().decode(file)
						: Buffer.from(file).toString('base64')
				}
			/>
			<input type="file" onChange={e => decodeFile(e.currentTarget.files)} />
			<input
				type="checkbox"
				id="is-pem"
				checked={pem}
				onChange={e => setPEM(e.currentTarget.checked)}
			/>{' '}
			<label htmlFor="is-pem">PEM</label>
			<select
				value={fileType}
				onChange={e => setFileType(e.currentTarget.value as FileType)}
			>
				<option value="cert">Certificate</option>
				<option value="csr">Certificate Signing Request</option>
				<option value="crl">Certificate Revocation List</option>
			</select>
			<pre>{decoded}</pre>
		</Container>
	);
}

export default App;
