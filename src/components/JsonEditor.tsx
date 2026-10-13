'use client';

import { Input, theme } from 'antd';
import { useState } from 'react';

export interface JsonEditorProps {
  id?: string;
  value: unknown;
  /**
   * Called with each valid parse while typing (`coalesce` is then true, so a burst of typing
   * undoes as one step); empty text yields `undefined`.
   */
  onChange: (value: unknown, coalesce?: boolean) => void;
  'aria-label'?: string;
  minRows?: number;
  maxRows?: number;
}

/**
 * JSON text editor. Valid JSON is applied while typing; invalid JSON is flagged and kept as a
 * draft without calling `onChange`. Blurring a valid draft reformats it.
 */
export function JsonEditor({
  id,
  value,
  onChange,
  'aria-label': ariaLabel,
  minRows = 3,
  maxRows = 12,
}: JsonEditorProps) {
  const { token } = theme.useToken();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const text = draft ?? (value === undefined ? '' : JSON.stringify(value, null, 2));

  const change = (next: string) => {
    setDraft(next);
    if (next.trim() === '') {
      setInvalid(false);
      onChange(undefined, true);
      return;
    }
    try {
      onChange(JSON.parse(next), true);
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  return (
    <Input.TextArea
      id={id}
      aria-label={ariaLabel}
      value={text}
      status={invalid ? 'error' : undefined}
      aria-invalid={invalid}
      placeholder="JSON"
      autoSize={{ minRows, maxRows }}
      spellCheck={false}
      style={{ fontFamily: token.fontFamilyCode, fontSize: token.fontSizeSM }}
      onChange={(e) => change(e.target.value)}
      onBlur={() => !invalid && setDraft(null)}
    />
  );
}
