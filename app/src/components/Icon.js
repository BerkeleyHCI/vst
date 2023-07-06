import React, { Component } from "react";

class Icon extends Component {
    shouldComponentUpdate(nextProps) {
        const { src } = this.props;
        return nextProps.src !== src;
    }

    render() {
        const { name } = this.props;
        return (
            <img src={`./open-iconic/svg/${name}.svg`} alt={`icon ${name}`} />
        );
    }
}

Icon.defaultProps = {
    name: "lightbulb",
    alt: "icon",
};

export default Icon;
