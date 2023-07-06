import React, { Component } from "react";

class ListHead extends Component {
    render() {
        const { children, className } = this.props;
        return (
            <div className={`list-head clearfix ${className}`}>{children}</div>
        );
    }
}

ListHead.defaultProps = {
    className: "",
};

export default ListHead;
