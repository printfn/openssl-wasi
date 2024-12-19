import { useEffect, useRef, type ChangeEvent, type CSSProperties } from 'react';

type Props = {
	style: CSSProperties;
	value: string;
	onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
};

// this stops the cursor from jumping to the end when editing

export function SafeTextArea({ onChange, style, value }: Props) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		if (ref.current && ref.current.value !== value) {
			ref.current.value = value;
		}
	}, [value]);
	return <textarea style={style} ref={ref} onChange={onChange} />;
}
