import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	startTransition,
	type ChangeEvent,
} from 'react';
import { type OpenSSLResult, execute } from './lib/openssl';
import { Button, Container, Form } from 'react-bootstrap';
import './main.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@fortawesome/fontawesome-free/css/svg-with-js.css';
import { useSearchParams } from 'react-router';
import { parseBase64, toBase64 } from './lib/base64';
import { SafeTextArea } from './components/SafeTextArea';
import { addLineBreaks } from './lib/utils';
import OutputFile from './components/OutputFile';

const FileTypes = [
	'cert',
	'csr',
	'crl',
	'pkcs7',
	'pkcs12',
	'asn1',
	'create-csr',
	'create-cert',
	'create-rsa',
	'create-ecc',
	'create-digest',
	'pkcs7-certs-crls',
	'pkcs12-certs',
	'pkcs12-keys',
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
		case 'pkcs12':
			return `openssl pkcs12 -passin pass:'Pa55w0rd' -in input_file -noenc`;
		case 'asn1':
			return `openssl asn1parse -i -in input_file -inform ${fmt}`;
		case 'create-csr':
			return `openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 -keyout private.key -out csr.req -noenc -verify -verbose -subj "/CN=example.com" -outform PEM -text -addext "subjectAltName=DNS:example.com"`;
		case 'create-cert':
			return `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 -keyout private.key -out certificate.crt -verbose -sha256 -days 7 -noenc -subj "/CN=example.com" -text -addext "subjectAltName=DNS:example.com"`;
		case 'create-rsa':
			return `openssl genrsa -out private.key 2048`;
		case 'create-ecc':
			return `openssl ecparam -name secp384r1 -text -out private.key -genkey`;
		case 'create-digest':
			return `openssl dgst -sha256 -out signature.bin input_file`;
		case 'pkcs7-certs-crls':
			return `openssl pkcs7 -in input_file -inform ${fmt} -out cert.crt -print_certs`;
		case 'pkcs12-certs':
			return `openssl pkcs12 -passin pass:'Pa55w0rd' -in input_file -nokeys -clcerts -out cert.crt`;
		case 'pkcs12-keys':
			return `openssl pkcs12 -passin pass:'Pa55w0rd' -in input_file -nocerts -noenc -out private.key`;
		default:
			throw new Error('unknown file type');
	}
}

type AppState = {
	file: Uint8Array;
	command: string;
};

function useAppState() {
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
		() => searchParams.get('command') ?? getCommand('cert', true),
		[searchParams],
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

function App() {
	const { command, file, setCommand, setFile } = useAppState();

	const [result, setResult] = useState<OpenSSLResult>({ output: <></> });
	const [autoExecute, setAutoExecute] = useState(true);

	const pem = useMemo(() => {
		if (command.includes('-inform PEM')) {
			return true;
		}
		if (command.includes('-inform DER') || command.includes('openssl pkcs12')) {
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
		startTransition(async () => {
			const result = await execute(command, file);
			setResult(result);
		});
	}, [file, command]);

	useEffect(() => {
		if (autoExecute) {
			executeCommand();
		}
	}, [autoExecute, executeCommand]);

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
		<Container>
			<h1>OpenSSL-WASI</h1>
			<p>
				<SafeTextArea
					style={{ width: '100%', height: '10rem', fontFamily: 'monospace' }}
					onChange={e => {
						setFile(
							der
								? parseBase64(e.currentTarget.value)
								: new TextEncoder().encode(e.currentTarget.value),
						);
					}}
					value={
						der ? addLineBreaks(toBase64(file)) : new TextDecoder().decode(file)
					}
				/>
				<input type="file" onChange={decodeFile} />
			</p>
			<p>
				<select
					disabled={pem === undefined}
					value={der ? 'der' : 'pem'}
					onChange={e => {
						if (fileType) {
							setCommand(getCommand(fileType, e.currentTarget.value === 'pem'));
						}
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
						<option value="pkcs12">PKCS #12</option>
						<option value="asn1">ASN.1</option>
					</optgroup>
					<optgroup label="Create">
						<option value="create-ecc">ECC Private Key</option>
						<option value="create-rsa">RSA Private Key</option>
						<option value="create-csr">Certificate Signing Request</option>
						<option value="create-cert">Self-Signed Certificate</option>
						<option value="create-digest">Message Digest</option>
					</optgroup>
					<optgroup label="Extract">
						<option value="pkcs7-certs-crls">
							PKCS #7 Certificates and CRLs
						</option>
						<option value="pkcs12-certs">PKCS #12 Certificate(s)</option>
						<option value="pkcs12-keys">PKCS #12 Private Key(s)</option>
					</optgroup>
				</select>
			</p>
			<p>
				<SafeTextArea
					style={{ width: '100%', fontFamily: 'monospace' }}
					value={command}
					onChange={e => {
						setCommand(e.currentTarget.value);
					}}
				/>
			</p>
			<div className="mb-3">
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
			</div>
			<hr />
			{result.files && result.files.length > 0 && (
				<div className="mb-3">
					<h4>Output File{result.files.length === 1 ? '' : 's'}:</h4>
					{result.files.map(file => (
						<div key={file.name}>
							<OutputFile file={file} />
						</div>
					))}
				</div>
			)}
			<h4>Terminal Output:</h4>
			<pre>{result.output}</pre>
		</Container>
	);
}

export default App;
