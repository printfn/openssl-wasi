export function toHex(bytes: Uint8Array) {
	if (bytes.toHex) {
		return bytes.toHex();
	}
	return Array.from(bytes, byte => {
		return ('0' + (byte & 0xff).toString(16)).slice(-2);
	}).join('');
}

export function fromHex(hex: string) {
	if (!hex) return new Uint8Array();
	hex = hex.replaceAll(/\s/g, '');
	const result = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		result[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return result;
}
