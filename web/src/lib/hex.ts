export function toHex(bytes: Uint8Array) {
	if (bytes.toHex) {
		return bytes.toHex();
	}
	return Array.from(bytes, byte => {
		return ('0' + (byte & 0xff).toString(16)).slice(-2);
	}).join('');
}
