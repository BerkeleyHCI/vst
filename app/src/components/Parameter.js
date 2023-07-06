import $ from "jquery";
import React, { Component } from "react";
import Input from "./Input.js";
import Checkbox from "./Checkbox.js";
import { isEqual } from "lodash";
import { getType, isNumber, isObject } from "../util.js";
import { throttle } from "lodash";
class Parameter extends Component {
    constructor(props) {
        super(props);
        this.inRef = React.createRef();
        this.state = { dragging: false };
    }

    componentDidMount() {
        const { value } = this.props;
        this.updateInput(value);
    }

    componentWillUnmount() {
        $(window).off("blur");
        $(document).off("mouseup");
        $(document).off("mousemove");
    }

    componentDidUpdate(prev) {
        const value = this.getInputValue();
        if (prev.value !== value) {
            this.updateInput(value);
        }
    }

    isCopied = () => {
        const { value, baseSValue } = this.props;
        if (isObject(value) && isObject(baseSValue)) {
            return isEqual(value, baseSValue);
        } else {
            return value == baseSValue;
        }
    };

    isUnchanged = () => {
        const { value, baseTValue } = this.props;
        if (isObject(value) && isObject(baseTValue)) {
            return isEqual(value, baseTValue);
        } else {
            return value == baseTValue;
        }
    };

    updateParam = (value) => {
        const { updateParameter, name, targets } = this.props;
        updateParameter({ name, targets, value });
    };

    updateInput = (value) => {
        if (this.inRef && this.inRef.current) {
            this.inRef.current.value = value;
        }
    };

    onMouseDown = () => {
        const { name, value } = this.props;
        const type = getType(name, value);
        if (this.inRef && type === "number") {
            $(window).on("blur", this.cancelDrag);
            $(document).on("mousemove", this.trackDrag);
            $(document).on("mouseup", this.confirmDrag);
            const dragValue = +this.inRef.current.value;
            this.setState({ dragging: true, dragValue });
        }
    };

    trackDrag = (e) => {
        const { originalEvent } = e;
        if (!originalEvent) return;
        const { dragValue } = this.state;
        let { max, min, step } = this.props;
        if (step == null) step = 1;
        let value = Number(dragValue) + step * originalEvent.movementX;

        if (value >= max) value = max;
        if (value <= min) value = min;
        if (value % 1 !== 0) value = Number(value.toFixed(2));

        this.setState({ dragValue: value });
        this.throttleRender(dragValue);
    };

    throttleRender = throttle(this.updateParam, 100);

    confirmDrag = () => {
        $(document).off("mouseup");
        $(document).off("mousemove");
        const { dragValue } = this.state;
        this.setState({ dragging: false });
        this.updateParam(dragValue);
    };

    cancelDrag = () => {
        $(document).off("mouseup");
        $(document).off("mousemove");
        this.setState({ dragging: false });
    };

    handleChange = (event) => {
        const { dragging } = this.state;
        if (!dragging) {
            const value = event.target.value;
            this.updateParam(value);
        }
    };

    handleCheck = () => {
        const { baseTValue, baseSValue } = this.props;
        const checked = this.isCopied();
        const newChecked = !checked;

        // Trigger style changes
        if (newChecked) {
            // selected: copy source param values
            this.updateParam(baseSValue);
        } else {
            // deselected: reset parameter values
            this.updateParam(baseTValue);
        }
    };

    getInputValue = () => {
        const { value } = this.props;
        const { dragging, dragValue } = this.state;
        if (dragging) {
            return dragValue;
        } else {
            return value;
        }
    };

    renderInput = () => {
        const { name, value, baseTValue } = this.props;
        const type = getType(name, value);
        return (
            <Input
                type={type}
                name={name}
                inRef={this.inRef}
                propValue={value}
                defaultValue={baseTValue}
                handleChange={this.handleChange}
            />
        );
    };

    renderSource = () => {
        const { name, baseSValue } = this.props;
        const type = getType(name, baseSValue);
        return (
            <Input
                type={type}
                name={name}
                className="disabled noselect"
                readOnly={true}
                disabled={true}
                value={baseSValue}
            />
        );
    };

    renderInitial = () => {
        const { name, baseTValue } = this.props;
        const type = getType(name, baseTValue);
        return (
            <Input
                type={type}
                name={name}
                className="disabled noselect"
                readOnly={true}
                disabled={true}
                value={baseTValue}
            />
        );
    };

    renderCopier = () => {
        const copied = this.isCopied();
        return (
            <label className="switch">
                <Checkbox
                    type={"checkbox"}
                    handleChange={this.handleCheck}
                    value={copied}
                />
                <span className="slider"></span>
            </label>
        );
    };

    render() {
        const { name, value, indent, topLevel } = this.props;
        const source = this.renderSource();
        const initial = this.renderInitial();
        const param = this.renderInput();
        const copier = this.renderCopier();
        const unchanged = this.isUnchanged();
        const extra = isNumber(value) ? " animation-param-number " : "";
        let parClass = unchanged ? "param unchanged-params" : "clearfix param";
        if (indent) parClass += " param-child";
        if (topLevel) parClass += " param-topLevel";

        return (
            <div className={parClass}>
                <div
                    className={"clearfix animation-param " + extra}
                    onMouseDown={this.onMouseDown}
                >
                    <span className="h-margin noselect">{name}</span>
                    <div className="left-param">
                        {source}
                        {initial}
                        {param}
                        {copier}
                    </div>
                </div>
            </div>
        );
    }
}

Parameter.defaultProps = {
    value: null,
};

export default Parameter;
