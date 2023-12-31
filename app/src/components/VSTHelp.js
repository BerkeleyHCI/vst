import React, { Component } from "react";

const projectURL = "https://jeremywrnr.com/vst";

const shortcuts = [
    { key: "h", description: "Help: Open/close this help menu." },
    { key: "o", description: "Open: Open an example graphics pair." },
    {
        key: "f",
        description: "Filtering: Toggle document/selection style filtering.",
    },
    {
        key: "d",
        description: "Document: Toggle target document/selection view.",
    },
    { key: "z", description: "Zoom: Reset all canvas zoom levels." },
    { key: "m", description: "Match: view match info (debugging)." },
];

class Help extends Component {
    render() {
        return (
            <div>
                {shortcuts.map((sc, i) => (
                    <p key={`help-line-${i}`}>
                        Crtl—<kbd>{sc.key}</kbd> : <span>{sc.description}</span>
                    </p>
                ))}

                <hr></hr>
                <a href={projectURL}>
                    See more details about VST at the project homepage.
                </a>
            </div>
        );
    }
}

export default Help;
