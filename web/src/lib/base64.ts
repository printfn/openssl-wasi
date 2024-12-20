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

export function toBase64Url(bytes: Uint8Array | null | undefined) {
	return toBase64(bytes)
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

export function fromBase64(base64: string | null | undefined) {
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

export function fromBase64Url(base64url: string | null | undefined) {
	if (!base64url) {
		return new Uint8Array();
	}
	let base64 = base64url.replaceAll('-', '+').replaceAll('_', '/');
	while (base64.length % 4 !== 0) {
		base64 += '=';
	}
	return fromBase64(base64);
}
