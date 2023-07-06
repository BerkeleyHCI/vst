import React, { Component } from "react";
import { v4 as uuid } from "uuid";

class Button extends Component {
    render() {
        const { id, handleClick, className, children, disabled, ...other } =
            this.props;
        const fullClass = `${className} ${disabled ? " disabled " : " "}`;

        return (
            <button
                id={id}
                className={fullClass}
                disabled={disabled}
                onClick={handleClick}
                {...other}
            >
                {children}
            </button>
        );
    }
}

Button.defaultProps = {
    handleClick: () => console.log("clicked"),
    className: "btn btn-outline-light",
    cursor: "initial",
    disabled: false,
    id: uuid(),
};

class DimButton extends Component {
    render() {
        const className = "small dimmer btn";
        return <Button className={className} {...this.props} />;
    }
}

export default Button;
export { DimButton };
