import {
	useCallback,
	useEffect,
	useRef,
	type ChangeEvent,
	type CSSProperties,
} from 'react';

type Props = {
	style: CSSProperties;
	value: string;
	onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
};

// this stops the cursor from jumping to the end when editing

export function SafeTextArea({ onChange, style, value }: Props) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const edits = useRef<Map<string, Date>>(new Map());
	useEffect(() => {
		if (!ref.current || ref.current.value === value) {
			return;
		}
		const edit = edits.current.get(value);
		if (edit && Date.now() - edit.valueOf() < 5000) {
			return;
		}
		ref.current.value = value;
	}, [value]);
	const myOnChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			edits.current.set(event.currentTarget.value, new Date());
			onChange(event);
		},
		[onChange],
	);
	return <textarea style={style} ref={ref} onChange={myOnChange} />;
}
