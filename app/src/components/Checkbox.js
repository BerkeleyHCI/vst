import React, { Component } from "react";

class Checkbox extends Component {
    render() {
        const {
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
        return (
            <input
                min={min}
                max={max}
                ref={inRef}
                checked={value}
                // defaultValue={value}
                className={className}
                onChange={handleChange}
                name={name}
                type={type}
                step={step}
                {...other}
            />
        );
    }
}

Checkbox.defaultProps = {
    handleChange: console.log,
};

export default Checkbox;
