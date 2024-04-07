import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { execute } from './openssl';
import { Button, Container, Form } from 'react-bootstrap';
import { Buffer } from 'node:buffer';
import './main.css';

const FileTypes = [
	'cert',
	'csr',
	'crl',
	'pkcs7',
	'asn1',
	'create-csr',
	'create-rsa',
	'create-ecc',
] as const;
type FileType = (typeof FileTypes)[number];

function getCommand(fileType: FileType, pem: boolean) {
	const fmt = pem ? 'PEM' : 'DER';
	switch (fileType) {
		case 'cert':
			return `openssl x509 -in input_file -inform ${fmt} -text -noout`;
		case 'csr':
			return `openssl req -in input_file -inform ${fmt} -text -noout -verify`;
		case 'crl':
			return `openssl crl -in input_file -inform ${fmt} -text -noout`;
		case 'pkcs7':
			return `openssl pkcs7 -in input_file -inform ${fmt} -print -noout`;
		case 'asn1':
			return `openssl asn1parse -i -in input_file -inform ${fmt}`;
		case 'create-csr':
			return `openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 -keyout - -out - -noenc -subj "/CN=example.com" -outform PEM -text -addext "subjectAltName=DNS:example.com"`;
		case 'create-rsa':
			return `openssl genrsa 2048`;
		case 'create-ecc':
			return `openssl ecparam -name secp384r1 -text -noout -genkey`;
		default:
			throw new Error('unknown file type');
	}
}

function App() {
	const [file, setFile] = useState(new Uint8Array());
	const [command, setCommand] = useState(getCommand('cert', true));
	const [decoded, setDecoded] = useState<ReactElement>(<></>);
	const [autoExecute, setAutoExecute] = useState(true);
	const pem = useMemo(() => {
		if (command.includes('-inform PEM')) {
			return true;
		}
		if (command.includes('-inform DER')) {
			return false;
		}
		return undefined;
	}, [command]);
	const der = useMemo(() => pem === false, [pem]);
	const fileType = useMemo(() => {
		for (const f of FileTypes) {
			if (getCommand(f, true) === command || getCommand(f, false) === command) {
				return f;
			}
		}
		return undefined;
	}, [command]);

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
							der
								? new Uint8Array(Buffer.from(e.currentTarget.value, 'base64'))
								: new TextEncoder().encode(e.currentTarget.value),
						);
					}}
					value={
						der
							? Buffer.from(file).toString('base64')
							: new TextDecoder().decode(file)
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
					disabled={pem === undefined}
					value={der ? 'der' : 'pem'}
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
						setCommand(
							getCommand(
								e.currentTarget.value as FileType,
								pem === undefined ? true : pem,
							),
						);
					}}
				>
					<optgroup label="Decode">
						<option value="cert">Certificate</option>
						<option value="csr">Certificate Signing Request</option>
						<option value="crl">Certificate Revocation List</option>
						<option value="pkcs7">PKCS #7</option>
						<option value="asn1">ASN.1</option>
					</optgroup>
					<optgroup label="Create">
						<option value="create-ecc">ECC Private Key</option>
						<option value="create-rsa">RSA Private Key</option>
						<option value="create-csr">Certificate Signing Request</option>
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
