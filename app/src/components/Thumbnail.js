import React, { Component } from "react";
import ClickBinding from "./ClickBinding.js";
import Image from "./Image.js";

class Thumbnail extends Component {
    constructor(props) {
        super(props);
        const interval = setInterval(this.getElement, 500);
        this.state = { loading: true, start: Date.now(), interval };
    }

    MAXTIME = 5000;

    getElement = () => {
        const { id, elem, canvasId } = this.props;
        const { loading, start } = this.state;
        if (elem) {
            this.loadItem(elem);
            return;
        }

        if (loading && window.canvas[canvasId]) {
            const item = window.canvas[canvasId].getItem(id);
            if (item) this.loadItem(item);
        }

        // stop trying
        if (loading && Date.now() - start >= this.MAXTIME) this.clearLoad();
    };

    loadItem = (item) => {
        if (item.width === 0 || item.height === 0) return;
        const pngData = item.toDataURL({
            enableRetinaScaling: true,
            format: "jpeg",
            quality: 1,
        });
        if (pngData !== "data:,") {
            this.setState({ loading: false, thumb: pngData }, this.clearLoad);
        }
    };

    clearLoad = () => {
        const { interval } = this.state;
        this.setState({ loading: false });
        clearInterval(interval);
    };

    componentWillUnmount = () => {
        const { interval } = this.state;
        clearInterval(interval);
    };

    render() {
        const { id, clickFocus, canvasId } = this.props;
        const { loading, thumb } = this.state;
        if (!loading && thumb) {
            if (clickFocus) {
                return (
                    <ClickBinding canvasId={canvasId} ids={[id]}>
                        <Image src={thumb} className="thumbnail" />
                    </ClickBinding>
                );
            } else {
                return (
                    <div className="thumbnail-container">
                        <Image src={thumb} className="thumbnail" />
                    </div>
                );
            }
        }

        return null;
    }
}

Thumbnail.defaultProps = {
    canvasId: "Source",
    hoverFocus: false,
    clickFocus: false,
};

export default Thumbnail;
