import React, { Ref } from 'react';
import TextArea, { TextAreaProps } from 'antd/lib/input/TextArea';
import { FieldProps, connectField, filterDOMProps } from 'uniforms';

import wrapField from './wrapField';

export type LongTextFieldProps = FieldProps<
  string,
  // FIXME: Why `onReset` fails with `wrapField`?
  Omit<TextAreaProps, 'onReset'>,
  { inputRef?: Ref<TextArea> }
>;

function LongText(props: LongTextFieldProps) {
  return wrapField(
    props,
    <TextArea
      disabled={props.disabled}
      name={props.name}
      onChange={event => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      ref={props.inputRef}
      value={props.value ?? ''}
      {...filterDOMProps(props)}
    />,
  );
}

LongText.defaultProps = { rows: 5 };

export default connectField(LongText, { kind: 'leaf' });
