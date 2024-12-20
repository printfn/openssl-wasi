export function addLineBreaks(s: string) {
	return s.replace(/(.{64})/g, '$1\n');
}

export function isBinary(file: Uint8Array) {
	for (let i = 0; i < file.length; ++i) {
		if (file[i] === 10 || file[i] === 13 || file[i] === 9) {
			continue;
		}
		if (file[i] <= 31 || file[i] >= 127) {
			return true;
		}
	}
	return false;
}
