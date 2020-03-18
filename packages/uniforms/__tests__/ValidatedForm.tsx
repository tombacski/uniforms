import React from 'react';
import { SimpleSchemaBridge } from 'uniforms-bridge-simple-schema';
import { ValidatedForm } from 'uniforms';

import mount from './_mount';

jest.mock('meteor/aldeed:simple-schema');
jest.mock('meteor/check');

describe('ValidatedForm', () => {
  const onChange = jest.fn();
  const onSubmit = jest.fn(async () => {});
  const onValidate = jest.fn((model, error, next) => next());
  const validator = jest.fn();
  const validatorForSchema = jest.fn(() => validator);

  const error = new Error();
  const model = { a: 1 };
  const schemaDefinition = {
    getDefinition() {},
    messageForError() {},
    objectKeys() {},
    validator: validatorForSchema,
  };
  const schema = new SimpleSchemaBridge(schemaDefinition);

  beforeEach(() => {
    onChange.mockReset();
    onSubmit.mockReset();
    onValidate.mockClear();
    validator.mockReset();
    validatorForSchema.mockClear();
  });

  describe('on validation', () => {
    let wrapper;
    let form;

    beforeEach(() => {
      wrapper = mount(
        <ValidatedForm model={model} schema={schema} onValidate={onValidate} />,
      );
      form = wrapper.instance();
    });

    it('validates (when `.validate` is called)', () => {
      form.validate();
      expect(validator).toHaveBeenCalledTimes(1);
    });

    it('correctly calls `validator`', () => {
      form.validate();
      expect(validator).toHaveBeenCalledTimes(1);
      expect(validator).toHaveBeenLastCalledWith(model);
    });

    it('updates error state with errors from `validator`', async () => {
      validator.mockImplementationOnce(() => {
        throw error;
      });

      form.validate().catch(() => {});
      await new Promise(resolve => process.nextTick(resolve));

      expect(wrapper.instance().getContext().state.error).toBe(error);
    });

    it('correctly calls `onValidate` when validation succeeds', () => {
      form.validate();
      expect(onValidate).toHaveBeenCalledTimes(1);
      expect(onValidate).toHaveBeenLastCalledWith(
        model,
        null,
        expect.any(Function),
      );
    });

    it('correctly calls `onValidate` when validation fails ', () => {
      validator.mockImplementation(() => {
        throw error;
      });

      form.validate().catch(() => {});

      expect(onValidate).toHaveBeenCalledTimes(1);
      expect(onValidate).toHaveBeenLastCalledWith(
        model,
        error,
        expect.any(Function),
      );
    });

    it('updates error state with async errors from `onValidate`', async () => {
      onValidate.mockImplementationOnce((model, existingError, next) => {
        next(error);
      });

      form.validate().catch(() => {});

      expect(wrapper.instance().getContext().state.error).toBe(error);
    });

    it('leaves error state alone when `onValidate` suppress `validator` errors', async () => {
      validator.mockImplementationOnce(() => {
        throw error;
      });
      onValidate.mockImplementationOnce((model, existingError, next) => {
        next(null);
      });
      form.validate();

      expect(validator).toHaveBeenCalled();
      expect(onValidate).toHaveBeenCalled();
      expect(wrapper.instance().getContext()).not.toHaveProperty(
        'uniforms.error',
        error,
      );
    });

    it('has `validating` context variable, default `false`', () => {
      expect(wrapper.instance().getContext().state.validating).toBe(false);
    });

    it('sets `validating` `true` while validating', async () => {
      onValidate.mockImplementationOnce(() => {});
      form.validate();
      expect(wrapper.instance().getContext().state.validating).toBe(true);

      // Resolve the async validation by calling the third argument of the first call to onValidate.
      expect(onValidate).toHaveBeenCalledTimes(1);
      onValidate.mock.calls[0][2]();
      expect(wrapper.instance().getContext().state.validating).toBe(false);
    });

    it('uses `modelTransform`s `validate` mode', () => {
      const transformedModel = { b: 1 };
      const modelTransform = (mode, model) =>
        mode === 'validate' ? transformedModel : model;
      wrapper.setProps({ modelTransform });
      form.validate();
      expect(validator).toHaveBeenLastCalledWith(transformedModel);
      expect(onValidate).toHaveBeenLastCalledWith(
        transformedModel,
        null,
        expect.any(Function),
      );
    });
  });

  describe('when submitted', () => {
    let wrapper;
    beforeEach(() => {
      wrapper = mount(
        <ValidatedForm
          model={model}
          schema={schema}
          onSubmit={onSubmit}
          onValidate={onValidate}
        />,
      );
    });

    it('calls `onSubmit` when validation succeeds', async () => {
      wrapper.find('form').simulate('submit');
      await new Promise(resolve => process.nextTick(resolve));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('skips `onSubmit` when validation fails', async () => {
      validator.mockImplementation(() => {
        throw error;
      });
      wrapper.find('form').simulate('submit');
      await new Promise(resolve => process.nextTick(resolve));

      expect(onSubmit).not.toBeCalled();
    });

    it('updates error state with async errors from `onSubmit`', async () => {
      onSubmit.mockImplementationOnce(() => Promise.reject(error));
      wrapper.find('form').simulate('submit');
      await new Promise(resolve => process.nextTick(resolve));

      expect(onSubmit).toHaveBeenCalled();
      expect(wrapper.instance().getContext().state.error).toBe(error);
    });

    it('sets `submitting` `true` while validating, before `BaseForm#onSubmit`', async () => {
      onValidate.mockImplementationOnce(() => {});
      wrapper.find('form').simulate('submit');
      await new Promise(resolve => process.nextTick(resolve));
      expect(wrapper.instance().getContext().state.submitting).toBe(true);
    });

    it('sets `submitting` back to `false` after sync `onSubmit`', async () => {
      onValidate.mockImplementationOnce(() => {});
      onSubmit.mockImplementationOnce(async () => {});
      wrapper.find('form').simulate('submit');
      await new Promise(resolve => process.nextTick(resolve));

      expect(onValidate).toHaveBeenCalledTimes(1);
      // Resolve the async validation by calling the third argument of the first call to onValidate.
      onValidate.mock.calls[0][2]();

      await new Promise(resolve => process.nextTick(resolve));
      expect(wrapper.instance().getContext().state.submitting).toBe(false);
    });

    it('works if unmounts on submit', async () => {
      onSubmit.mockImplementationOnce(() => wrapper.unmount());
      wrapper.find('form').simulate('submit');
      await new Promise(resolve => process.nextTick(resolve));
    });
  });

  describe('on change', () => {
    describe('in `onChange` mode', () => {
      it('validates', () => {
        const wrapper = mount<typeof ValidatedForm>(
          <ValidatedForm model={model} schema={schema} validate="onChange" />,
        );
        wrapper
          .instance()
          .getContext()
          .onChange('key', 'value');

        expect(validator).toHaveBeenCalledTimes(1);
      });
    });

    describe('in `onSubmit` mode', () => {
      it('does not validate', () => {
        const wrapper = mount<typeof ValidatedForm>(
          <ValidatedForm model={model} schema={schema} validate="onSubmit" />,
        );
        wrapper
          .instance()
          .getContext()
          .onChange('key', 'value');

        expect(validator).not.toHaveBeenCalled();
      });
    });

    describe('in `onChangeAfterSubmit` mode', () => {
      let wrapper;
      beforeEach(() => {
        wrapper = mount<typeof ValidatedForm>(
          <ValidatedForm
            model={model}
            schema={schema}
            validate="onChangeAfterSubmit"
          />,
        );
      });

      it('does not validates before submit', () => {
        wrapper
          .instance()
          .getContext()
          .onChange('key', 'value');
        expect(validator).not.toHaveBeenCalled();
      });

      it('validates after submit', async () => {
        wrapper.find('form').simulate('submit');
        await new Promise(resolve => process.nextTick(resolve));

        validator.mockReset();
        wrapper
          .instance()
          .getContext()
          .onChange('key', 'value');
        expect(validator).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('on reset', () => {
    it('removes `error`', () => {
      const wrapper = mount<typeof ValidatedForm>(
        <ValidatedForm model={model} onSubmit={onSubmit} schema={schema} />,
      );
      validator.mockImplementationOnce(() => {
        throw new Error();
      });
      wrapper.find('form').simulate('submit');
      expect(wrapper.instance().getContext().state.error).toBeTruthy();

      wrapper.instance().reset();
      expect(wrapper.instance().getContext().state.error).toBeNull();
    });
  });

  describe('when props are changed', () => {
    const anotherModel = { x: 2 };

    describe('in `onChange` mode', () => {
      let wrapper;
      beforeEach(() => {
        wrapper = mount<typeof ValidatedForm>(
          <ValidatedForm model={model} schema={schema} validate="onChange" />,
        );
      });

      it('does not revalidate arbitrarily', () => {
        wrapper.setProps({ anything: 'anything' });
        expect(validator).not.toBeCalled();
      });

      it('revalidates if `model` changes', () => {
        wrapper.setProps({ model: anotherModel });
        expect(validator).toHaveBeenCalledTimes(1);
      });

      it('revalidates if `validator` changes', () => {
        wrapper.setProps({ validator: {} });
        expect(validator).toHaveBeenCalledTimes(1);
      });

      it('revalidate if `schema` changes', () => {
        wrapper.setProps({ schema: new SimpleSchemaBridge(schemaDefinition) });
        expect(validator).toHaveBeenCalledTimes(1);
      });
    });

    describe('in `onSubmit` mode', () => {
      let wrapper;
      beforeEach(() => {
        wrapper = mount<typeof ValidatedForm>(
          <ValidatedForm model={model} schema={schema} validate="onSubmit" />,
        );
      });

      it('does not revalidate when `model` changes', () => {
        wrapper.setProps({ model: {} });
        expect(validator).not.toBeCalled();
      });

      it('does not revalidate when validator `options` change', () => {
        wrapper.setProps({ validator: {} });
        expect(validator).not.toBeCalled();
      });

      it('does not revalidate when `schema` changes', () => {
        wrapper.setProps({ schema: new SimpleSchemaBridge(schemaDefinition) });
        expect(validator).not.toBeCalled();
      });
    });

    describe('in any mode', () => {
      let wrapper;
      beforeEach(() => {
        wrapper = mount<typeof ValidatedForm>(
          <ValidatedForm model={model} schema={schema} />,
        );
      });

      it('reuses the validator between validations', () => {
        ['1', '2', '3'].forEach(value => {
          wrapper
            .instance()
            .getContext()
            .onChange('key', value);
          wrapper.find('form').simulate('submit');
        });

        expect(validatorForSchema).toHaveBeenCalledTimes(1);
      });

      it('uses the new validator settings if `validator` changes', () => {
        const validatorA = Symbol();
        const validatorB = Symbol();

        wrapper.setProps({ validator: validatorA });
        expect(validatorForSchema).toHaveBeenCalledTimes(2);
        expect(validatorForSchema).toHaveBeenNthCalledWith(2, validatorA);

        wrapper.setProps({ validator: validatorB });
        expect(validatorForSchema).toHaveBeenCalledTimes(3);
        expect(validatorForSchema).toHaveBeenNthCalledWith(3, validatorB);

        wrapper.setProps({ validator: validatorA });
        expect(validatorForSchema).toHaveBeenCalledTimes(4);
        expect(validatorForSchema).toHaveBeenNthCalledWith(4, validatorA);
      });

      it('uses the new validator if `schema` changes', () => {
        const alternativeValidator = jest.fn();
        const alternativeSchema = new SimpleSchemaBridge({
          getDefinition() {},
          messageForError() {},
          objectKeys() {},
          validator: () => alternativeValidator,
        });

        wrapper.setProps({ schema: alternativeSchema });
        wrapper.find('form').simulate('submit');

        expect(validator).not.toBeCalled();
        expect(alternativeValidator).toHaveBeenCalledTimes(1);
      });
    });
  });
});
