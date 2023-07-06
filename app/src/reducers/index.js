import { combineReducers } from "redux";

import filter from "./filter.js";
import modalData from "./modalData.js";
import preview from "./parameterPreview.js";
import selection from "./selection.js";

const reducers = combineReducers({
    modalData,
    selection,
    preview,
    filter,
});

export default reducers;
