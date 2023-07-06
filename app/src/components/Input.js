import React, { Component } from "react";
// import Image from "./Image.js";
class Input extends Component {
    render() {
        let {
            // disabled,
            // readOnly,
            propValue,
            defaultValue,
            inRef,
            name,
            type,
            value,
            min,
            max,
            step,
            handleChange,
            className,
            ...other
        } = this.props;

        let containerClass = "input-container";
        let transparent =
            propValue === "transparent" || value === "transparent";

        if ((!value && !propValue && !defaultValue) || transparent) {
            containerClass += " empty-value";
            className += " empty-input";
        }

        // For color objects
        if (type == "object") value = " { ... } ";

        // type={condition ? value : undefined}
        if (!type) type = undefined;

        return (
            <div className={containerClass}>
                <input
                    min={min}
                    max={max}
                    ref={inRef}
                    // value={value}
                    // checked={value}
                    defaultValue={value}
                    className={className}
                    onInput={handleChange}
                    name={name}
                    type={type}
                    step={step}
                    {...other}
                />
            </div>
        );
    }
}

Input.defaultProps = {
    handleChange: console.log,
};

export default Input;
