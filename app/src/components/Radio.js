import React, { Component } from "react";

class Radio extends Component {
    renderOption = (value, i) => {
        if (i === 0) {
            return (
                <span className="radio" key={`${i} ${value}`} checked>
                    <input type="radio" value={value} name="matchBy" />
                    {value}
                </span>
            );
        } else {
            return (
                <span className="radio" key={`${i} ${value}`}>
                    <input type="radio" value={value} name="matchBy" />
                    {value}
                </span>
            );
        }
    };

    render() {
        const { options, handleChange } = this.props;
        const dropList = options.map(this.renderOption);
        return <span onChange={handleChange}>{dropList}</span>;
    }
}

Radio.defaultProps = {
    handleChange: console.log,
    pre: "",
};

export default Radio;
