import { saveAs } from "file-saver";

export const downloadContent = (filename, text) => {
    let blob = new Blob([text], {
        // type: "text/plain;charset=utf-8",
        type: "text/json;charset=utf-8",
    });
    saveAs(blob, filename);
};

export const OLD__downloadContent = (filename, text) => {
    var pom = document.createElement("a");
    pom.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    pom.setAttribute("download", filename);

    if (document.createEvent) {
        var event = document.createEvent("MouseEvents");
        event.initEvent("click", true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
};
