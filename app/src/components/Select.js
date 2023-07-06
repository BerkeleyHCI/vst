import React, { Component } from "react";

class Select extends Component {
    renderOption = (value, i) => {
        return (
            <option key={`${i} ${value}`} value={value} autoComplete="off">
                {value}
            </option>
        );
    };

    // Strange bug: will occasionally be very slow on the first edit render.
    render() {
        const { options, inRef, handleChange, ...other } = this.props;
        const dropList = options.map(this.renderOption);

        return (
            <select
                ref={inRef}
                onChange={handleChange}
                {...other}
                autoComplete="off"
            >
                {dropList}
            </select>
        );
    }
}

Select.defaultProps = {
    handleChange: console.log,
    options: [],
    pre: "",
};

export default Select;
