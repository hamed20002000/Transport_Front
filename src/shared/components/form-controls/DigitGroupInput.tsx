import { useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { regroupDigits } from 'src/shared/utils/digitGroups';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string; onValueChange: (value: string) => void };

const isSeparator = (char: string | undefined) => char === ',' || char === '٬';
// the caret's place counted without separators, which move as the figure is regrouped
const typedBefore = (text: string, at: number) => [...text.slice(0, at)].filter((char) => !isSeparator(char)).length;

function caretAt(text: string, typed: number) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (count === typed) return i;
    if (!isSeparator(text[i])) count++;
  }
  return text.length;
}

/**
 * A free-text input («۴۵۰۰۰۰۰۰ تومان», «22000 کیلو») that puts thousands separators into figures as they are
 * typed, keeping the caret where the user is typing. Deleting a separator deletes the digit next to it.
 */
export default function DigitGroupInput({ value, onValueChange, maxLength, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caret.current !== null && input.current === document.activeElement) input.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  function change(event: ChangeEvent<HTMLInputElement>) {
    let raw = event.target.value;
    let at = event.target.selectionStart ?? raw.length;
    // a lone separator deleted would come straight back: delete the digit beside it instead
    const kind = (event.nativeEvent as InputEvent).inputType;
    if (raw.length === value.length - 1 && isSeparator(value[at]) && /[0-9۰-۹٠-٩]/.test(raw[at - 1] ?? '') && regroupDigits(raw) === value) {
      if (kind === 'deleteContentBackward') {
        raw = raw.slice(0, at - 1) + raw.slice(at);
        at -= 1;
      } else if (kind === 'deleteContentForward') {
        raw = raw.slice(0, at) + raw.slice(at + 1);
      }
    }
    const grouped = regroupDigits(raw);
    // grouping must not push the text past the field's limit
    const next = maxLength !== undefined && grouped.length > maxLength ? raw : grouped;
    caret.current = caretAt(next, typedBefore(raw, at));
    onValueChange(next);
  }

  return <input {...props} ref={input} maxLength={maxLength} value={value} onChange={change} />;
}
