import { useCallback, useEffect, useState } from "react";
import { execute } from "./openssl";
import { Container } from "react-bootstrap";
import { Buffer } from "node:buffer";

function getCommand(fileType: "cert" | "csr", pem: boolean) {
	return [
		fileType === "cert" ? "x509" : "req",
		"-in",
		"inputfile",
		"-inform",
		pem ? "PEM" : "DER",
		"-text",
		"-noout",
	];
}

function App() {
	const [file, setFile] = useState(new Uint8Array());
	const [fileType, setFileType] = useState<"cert" | "csr">("cert");
	const [pem, setPEM] = useState(true);
	const [decoded, setDecoded] = useState("");

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
		[setFile]
	);

	return (
		<Container>
			<h1>Decode ASN1</h1>
			<textarea
				style={{ width: "100%", height: "10rem" }}
				onChange={e => setFile(new TextEncoder().encode(e.currentTarget.value))}
				value={
					pem
						? new TextDecoder().decode(file)
						: Buffer.from(file).toString("base64")
				}
			/>
			<input type="file" onChange={e => decodeFile(e.currentTarget.files)} />
			<input type="checkbox" id="is-pem" checked={pem} onChange={e => setPEM(e.currentTarget.checked)} /> <label htmlFor="is-pem">PEM</label>
			<select value={fileType} onChange={e => setFileType(e.currentTarget.value as "cert" | "csr")}>
				<option value="cert">Certificate</option>
				<option value="csr">Certificate Signing Request</option>
			</select>
			<pre>{decoded}</pre>
		</Container>
	);
}

export default App;
