import React, { Component } from "react";

class Image extends Component {
    shouldComponentUpdate(nextProps) {
        const { src } = this.props;
        return nextProps.src !== src;
    }

    render() {
        const { src, alt, className, ...other } = this.props;
        return <img src={src} alt={alt} className={className} {...other} />;
    }
}

Image.defaultProps = {
    className: "icon icon-save",
    src: "x.svg",
    // src: "loading.gif",
    alt: "image",
};

export default Image;
