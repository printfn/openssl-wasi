export function addLineBreaks(s: string) {
	return s.replace(/(.{64})/g, '$1\n');
}
