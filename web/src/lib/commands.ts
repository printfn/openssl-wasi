type Option = Selection | Freeform | Checkboxes;

type Selection = {
	name: string;
	selection: { name: string; resolve: () => Option | string }[];
};
type Freeform = {
	name: string;
	resolve: (input: string) => Option | string;
	freeform: true;
};
type Checkboxes = {
	name: string;
	resolve: (keys: Set<string>) => Option | string;
	checkboxes: { name: string; key: string }[];
};

const pemDer: (f: (fmt: 'der' | 'pem') => string) => () => Selection =
	f => () => ({
		name: 'input format',
		selection: [
			{ name: 'PEM', resolve: () => f('pem') },
			{ name: 'DER', resolve: () => f('der') },
		],
	});

export const commands: Selection['selection'] = [
	{
		name: 'cert',
		resolve: pemDer(
			fmt => `openssl x509 -in input_file -inform ${fmt} -text -noout`,
		),
	},
	{
		name: 'csr',
		resolve: pemDer(
			fmt => `openssl req -in input_file -inform ${fmt} -text -noout -verify`,
		),
	},
	{
		name: 'crl',
		resolve: pemDer(
			fmt => `openssl crl -in input_file -inform ${fmt} -text -noout`,
		),
	},
	{
		name: 'pkcs7',
		resolve: pemDer(
			fmt => `openssl pkcs7 -in input_file -inform ${fmt} -print -noout`,
		),
	},
	{
		name: 'pkcs12',
		resolve: () =>
			`openssl pkcs12 -passin pass:'Pa55w0rd' -in input_file -noenc`,
	},
	{
		name: 'asn1',
		resolve: pemDer(
			fmt => `openssl asn1parse -i -in input_file -inform ${fmt}`,
		),
	},
	{
		name: 'create-csr',
		resolve: () =>
			`openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 -keyout private.key -out csr.req -noenc -verify -verbose -subj "/CN=example.com" -outform PEM -text -addext "subjectAltName=DNS:example.com"`,
	},
	{
		name: 'create-cert',
		resolve: () =>
			`openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 -keyout private.key -out certificate.crt -verbose -sha256 -days 7 -noenc -subj "/CN=example.com" -text -addext "subjectAltName=DNS:example.com"`,
	},
	{ name: 'create-rsa', resolve: () => `openssl genrsa -out private.key 2048` },
	{
		name: 'create-ecc',
		resolve: () =>
			`openssl ecparam -name secp384r1 -text -out private.key -genkey`,
	},
	{
		name: 'create-digest',
		resolve: () => `openssl dgst -sha256 -out signature.bin input_file`,
	},
	{
		name: 'pkcs7-certs-crls',
		resolve: pemDer(
			fmt =>
				`openssl pkcs7 -in input_file -inform ${fmt} -out cert.crt -print_certs`,
		),
	},
	{
		name: 'pkcs12-certs',
		resolve: () =>
			`openssl pkcs12 -passin pass:'Pa55w0rd' -in input_file -nokeys -clcerts -out cert.crt`,
	},
	{
		name: 'pkcs12-keys',
		resolve: () =>
			`openssl pkcs12 -passin pass:'Pa55w0rd' -in input_file -nocerts -noenc -out private.key`,
	},
];
