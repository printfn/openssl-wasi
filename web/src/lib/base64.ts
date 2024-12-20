export function toBase64(bytes: Uint8Array | null | undefined) {
	if (bytes === null || bytes === undefined) {
		return '';
	}
	if (bytes.toBase64) {
		return bytes.toBase64();
	}
	return btoa(
		bytes.reduce((acc, current) => acc + String.fromCharCode(current), ''),
	);
}

export function parseBase64(base64: string | null | undefined) {
	try {
		if (!base64) {
			return new Uint8Array();
		}
		return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
	} catch (e) {
		console.error(`${base64 as string} is not valid base64:`, e);
		throw new Error('invalid base64 data');
	}
}
