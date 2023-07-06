import React, { Component } from "react";
import Button from "./Button.js";

const examples = [
    "text-to-text.json",
    "plate-to-bowl.json",
    "step-to-part.json",
    "step-to-stepVert.json",
    "timeline-to-step.json",
    "red-to-sky.json",
    "prof-to-prof.json",
    "sky-to-kasa.json",
    "title-to-title.json",
    "slide-to-slide.json",
];

class Examples extends Component {
    render() {
        const { handleExampleJSON } = this.props;
        return (
            <div>
                {examples.map((example, i) => (
                    <Button
                        className="btn"
                        key={`example-${i}`}
                        onClick={() => handleExampleJSON(example)}
                    >
                        <b>{i + 1}</b> — {example.replace(".json", "")}
                    </Button>
                ))}
            </div>
        );
    }
}

export default Examples;
