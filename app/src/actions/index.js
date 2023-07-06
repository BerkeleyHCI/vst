//
// -- BOOLEAN FILTERS ------------------------
//

export const setFilter = (filter) => ({
    type: "SET_FILTER",
    filter,
});

//
// -- MODAL DATA ------------------------
//

export const setModal = ({ modalOpen, modalContent, modalTitle }) => ({
    type: "SET_MODAL",
    modalOpen,
    modalContent,
    modalTitle,
});

//
// -- PREVIEW PARAMS ------------------------
//

export const setPreview = (preview) => ({
    type: "SET_PREVIEW",
    preview,
});

export const updatePreview = (update) => ({
    type: "UPDATE_PREVIEW",
    update,
});

export const updatePreviewParam = (parameter) => ({
    type: "UPDATE_PREVIEW_PARAM",
    parameter,
});

export const clearPreview = () => ({
    type: "CLEAR_PREVIEW",
});

//
// -- SELECTION: CANVAS, TIMELINE BINDINGs ------
//

export const setCanvasSelection = ({ canvasId, selection }) => ({
    type: "SET_CANVAS_SELECTION",
    selection,
    canvasId,
});

export const clearSelection = () => ({
    type: "CLEAR_CANVAS_SELECTION",
});
