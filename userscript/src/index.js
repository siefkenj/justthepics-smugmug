import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { awaitElement, log, addLocationChangeCallback } from "./utils";
import { ImageContainer } from "./image-container";

log("React script has successfully started");

// Do required initial work. Gets called every time the URL changes,
// so that elements can be re-inserted as a user navigates a page with
// different routes.
async function main() {
    // Check for magic URL before doing anything.
    if (window.location.host === "justthepics.smugmug.com") {
        ReactDOM.render(<ImageContainer />, document.body);
        // Set up some must-have styling. We don't want to include these in the style sheets in case it 
        const html = document.body.parentElement;
        html.classList.add("justthepics-image-container")
        return;
    }
    // Find <body/>. This can be any element. We wait until
    // the page has loaded enough for that element to exist.
    const body = await awaitElement("body  div.sm-gallery-images");
    const container = document.createElement("div");
    container.style.width = "100%";
    body.replaceChildren(container);
    //   body.appendChild(container);
    ReactDOM.render(<App />, container);
}

// Call `main()` every time the page URL changes, including on first load.
addLocationChangeCallback(() => {
    // Greasemonkey doesn't bubble errors up to the main console,
    // so we have to catch them manually and log them
    main().catch((e) => {
        log(e);
    });
});
