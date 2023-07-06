import React from "react";
import ReactDOM from "react-dom/client";
import { createStore } from "redux";
import { Provider } from "react-redux";
import App from "./components/App.js";
import toastr from "toastr";
import reducer from "./reducers/index.js";
import { setFilter } from "./actions/index.js";

// Toast (pop up notifications)
// const longTime = 100000000
toastr.options = {
    closeButton: false,
    debug: false,
    newestOnTop: true,
    progressBar: false,
    positionClass: "toast-bottom-right",
    preventDuplicates: false,
    // preventDuplicates: true,
    onclick: null,
    showDuration: "1",
    hideDuration: "1",
    timeOut: "2000",
    extendedTimeOut: "4000",
    showEasing: "swing",
    hideEasing: "swing",
    showMethod: "fadeIn",
    hideMethod: "fadeOut",
    // "timeOut": longTime,
    // "extendedTimeOut": longTime,
};

// global variables for storing state
window.toastr = toastr;
window.vst = {};
window.canvas = {};

const store = createStore(
    reducer,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

// Slower but with dev tool tracing enabled, disable for user study
// import { composeWithDevTools } from "redux-devtools-extension";
// const composeEnhancers = composeWithDevTools({ trace: true, traceLimit: 25 });
// const store = createStore(reducer, /* preloadedState, */ composeEnhancers());
store.dispatch(setFilter({ matched: false, portrait: true }));

// As of React 18
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <Provider store={store}>
        <App />
    </Provider>
);
