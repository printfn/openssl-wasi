import { useCallback, useEffect, useState } from 'react';
import { execute } from './openssl';
import { Container } from 'react-bootstrap';
import { Buffer } from 'node:buffer';

type FileType = 'cert' | 'csr' | 'crl' | 'pkcs#7';

function getCommand(fileType: FileType, pem: boolean) {
	const fmt = pem ? 'PEM' : 'DER';
	switch (fileType) {
		case 'cert':
			return ['x509', '-in', 'inputfile', '-inform', fmt, '-text', '-noout'];
		case 'csr':
			return ['req', '-in', 'inputfile', '-inform', fmt, '-text', '-noout'];
		case 'crl':
			return ['crl', '-in', 'inputfile', '-inform', fmt, '-text', '-noout'];
		case 'pkcs#7':
			return ['pkcs7', '-in', 'inputfile', '-inform', fmt, '-print', '-noout'];
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
			<p>
				<textarea
					style={{ width: '100%', height: '10rem' }}
					onChange={e =>
						setFile(
							pem
								? new TextEncoder().encode(e.currentTarget.value)
								: new Uint8Array(Buffer.from(e.currentTarget.value, 'base64')),
						)
					}
					value={
						pem
							? new TextDecoder().decode(file)
							: Buffer.from(file).toString('base64')
					}
				/>
				<input type="file" onChange={e => decodeFile(e.currentTarget.files)} />
			</p>
			<p>
				<select
					value={pem ? 'pem' : 'der'}
					onChange={e => setPEM(e.currentTarget.value === 'pem')}
				>
					<option value="pem">PEM</option>
					<option value="der">DER</option>
				</select>
				<select
					value={fileType}
					onChange={e => setFileType(e.currentTarget.value as FileType)}
				>
					<option value="cert">Certificate</option>
					<option value="csr">Certificate Signing Request</option>
					<option value="crl">Certificate Revocation List</option>
					<option value="pkcs#7">PKCS #7</option>
				</select>
			</p>
			<pre>{decoded}</pre>
		</Container>
	);
}

export default App;
