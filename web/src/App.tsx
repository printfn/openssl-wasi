import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { execute } from './openssl';
import { Button, Container, Form } from 'react-bootstrap';
import { Buffer } from 'node:buffer';
import './main.css';

type FileType = 'cert' | 'csr' | 'crl' | 'pkcs#7' | 'create-csr';
const FileTypes: FileType[] = ['cert', 'csr', 'crl', 'pkcs#7', 'create-csr'];

function getCommand(fileType: FileType, pem: boolean) {
	const fmt = pem ? 'PEM' : 'DER';
	switch (fileType) {
		case 'cert':
			return `openssl x509 -in input_file -inform ${fmt} -text -noout`;
		case 'csr':
			return `openssl req -in input_file -inform ${fmt} -text -noout`;
		case 'crl':
			return `openssl crl -in input_file -inform ${fmt} -text -noout`;
		case 'pkcs#7':
			return `openssl pkcs7 -in input_file -inform ${fmt} -print -noout`;
		case 'create-csr':
			return `openssl req -new -keyout - -out - -noenc -subj "/CN=example.com" -outform PEM -text -addext "subjectAltName=DNS:example.com"`;
		default:
			throw new Error('unknown file type');
	}
}

function App() {
	const [file, setFile] = useState(new Uint8Array());
	const [command, setCommand] = useState(getCommand('cert', true));
	const [decoded, setDecoded] = useState<ReactElement>(<></>);
	const [autoExecute, setAutoExecute] = useState(true);
	const pem = useMemo(() => command.includes('-inform PEM'), [command]);
	const fileType = useMemo(() => {
		for (const f of FileTypes) {
			if (getCommand(f, pem) === command) {
				return f;
			}
		}
		return undefined;
	}, [command, pem]);

	const executeCommand = useCallback(() => {
		(async () => {
			const result = await execute(command, file);
			setDecoded(result);
		})();
	}, [file, command]);

	useEffect(() => {
		if (autoExecute) {
			executeCommand();
		}
	}, [autoExecute, executeCommand]);

	const decodeFile = useCallback(
		(files: FileList | null) => {
			if (!files?.[0]) {
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
			<h1>OpenSSL-WASI</h1>
			<p>
				<textarea
					style={{ width: '100%', height: '10rem' }}
					onChange={e => {
						setFile(
							pem
								? new TextEncoder().encode(e.currentTarget.value)
								: new Uint8Array(Buffer.from(e.currentTarget.value, 'base64')),
						);
					}}
					value={
						pem
							? new TextDecoder().decode(file)
							: Buffer.from(file).toString('base64')
					}
				/>
				<input
					type="file"
					onChange={e => {
						decodeFile(e.currentTarget.files);
					}}
				/>
			</p>
			<p>
				<select
					value={pem ? 'pem' : 'der'}
					onChange={e => {
						fileType &&
							setCommand(getCommand(fileType, e.currentTarget.value === 'pem'));
					}}
				>
					<option value="pem">PEM</option>
					<option value="der">DER</option>
				</select>{' '}
				<select
					value={fileType}
					onChange={e => {
						setCommand(getCommand(e.currentTarget.value as FileType, pem));
					}}
				>
					<optgroup label="Decode">
						<option value="cert">Certificate</option>
						<option value="csr">Certificate Signing Request</option>
						<option value="crl">Certificate Revocation List</option>
						<option value="pkcs#7">PKCS #7</option>
					</optgroup>
					<optgroup label="Create">
						<option value="create-csr">Create CSR</option>
					</optgroup>
				</select>
			</p>
			<p>
				<textarea
					style={{ width: '100%' }}
					value={command}
					onChange={e => {
						setCommand(e.currentTarget.value);
					}}
				/>
			</p>
			<p>
				<Form.Switch
					id="auto-execute"
					label="Auto-execute"
					checked={autoExecute}
					onChange={e => {
						setAutoExecute(e.currentTarget.checked);
					}}
				/>
				<Button
					variant="primary"
					disabled={autoExecute}
					onClick={() => {
						executeCommand();
					}}
				>
					Execute
				</Button>
			</p>
			<pre>{decoded}</pre>
		</Container>
	);
}

export default App;
