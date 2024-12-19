export async function toBase64(bytes: Uint8Array | null | undefined) {
	if (bytes === null || bytes === undefined) {
		return '';
	}
	if (bytes.toBase64) {
		return bytes.toBase64();
	}
	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = Object.assign(new FileReader(), {
			onload: () => {
				resolve(reader.result as string);
			},
			onerror: () => {
				const error = new Error(
					reader.error
						? `${reader.error.name}: ${reader.error.message}`
						: 'unknown error',
					{ cause: reader.error },
				);
				reject(error);
			},
		});
		reader.readAsDataURL(
			new File([bytes], '', { type: 'application/octet-stream' }),
		);
	});
	const prefix = 'data:application/octet-stream;base64,';
	if (!dataUrl.startsWith(prefix)) {
		throw new Error(`invalid data URL: ${dataUrl}`);
	}
	return dataUrl.substring(prefix.length);
}

export async function parseBase64(base64: string | null | undefined) {
	try {
		if (!base64) {
			return new Uint8Array();
		}
		const res = await fetch(`data:application/octet-stream;base64,${base64}`);
		return new Uint8Array(await res.arrayBuffer());
	} catch (e) {
		console.error(`${base64 as string} is not valid base64:`, e);
		throw new Error('invalid base64 data');
	}
}
