import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import set from 'lodash/set';

import ValidatedQuickForm from './ValidatedQuickForm';

const Auto = (parent: any): any => {
  class _ extends parent {
    static Auto = Auto;

    static displayName = `Auto${parent.displayName}`;

    constructor(...args: any[]) {
      super(...args);

      // @ts-ignore
      this.state = {
        ...this.state,

        model: this.props.model,
        modelSync: this.props.model,
      };
    }

    componentDidUpdate(prevProps) {
      const { model } = this.props;
      if (!isEqual(model, prevProps.model)) {
        this.setState({ model, modelSync: model });
      }

      // @ts-ignore
      super.componentDidUpdate(...arguments);
    }

    getNativeFormProps(): Record<string, unknown> {
      return omit(super.getNativeFormProps(), ['onChangeModel']);
    }

    getModel(mode: any) {
      return mode === 'form' ? this.state.modelSync : this.state.model;
    }

    onChange(key: any, value: any) {
      const updateState = (state: any) => ({
        modelSync: set(cloneDeep(state.modelSync), key, value),
      });
      const updateModel = (state: any) => {
        if (this.props.onChangeModel) {
          this.props.onChangeModel(state.modelSync);
        }

        return { model: state.modelSync };
      };

      // Before componentDidMount, every call to onChange should call BaseForm#onChange synchronously
      if (this.state.changed === null) {
        this.setState(updateState);
        super.onChange(key, value);
        this.setState(updateModel);
      } else {
        this.setState(updateState, () => {
          super.onChange(key, value);
          this.setState(updateModel);
        });
      }
    }

    __reset(state: any) {
      return {
        ...super.__reset(state),
        model: this.props.model,
        modelSync: this.props.model,
      };
    }

    onValidate() {
      // @ts-ignore
      return this.onValidateModel(this.getContextModel());
    }
  }

  return _;
};

export default Auto(ValidatedQuickForm);
