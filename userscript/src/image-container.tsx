import React from "react";
import "./App.css";

export function ImageContainer() {
    const [zoomed, setZoomed] = React.useState(false);
    const [clickedCoords, setClickedCoords] = React.useState([0, 0]);
    const imageUrl = React.useMemo(() => {
        const url = new URL(window.location.href);
        return url.searchParams.get("proxy_url");
    }, []);

    React.useLayoutEffect(() => {
        if (!zoomed) {
            return;
        }
        // Calculate how much scrolling is needed to
        // put the coordinates clicked in the center of the screen.
        const [xp, yp] = clickedCoords;
        const img = document.body.querySelector("img");
        const imgRect = img?.getBoundingClientRect();
        if (!imgRect) {
            return;
        }
        const screenRect = document.body.getBoundingClientRect();
        const [screenW, screenH] = [screenRect.width, screenRect.height];
        document.body.scroll(
            imgRect.width * xp - screenW / 2,
            imgRect.height * yp - screenH / 2
        );
    }, [zoomed, clickedCoords]);

    if (!imageUrl) {
        return <h3>Cannot find image_url in the search params</h3>;
    }

    return (
        <img
            alt=""
            src={imageUrl}
            style={{
                imageOrientation: "from-image",
                textAlign: "center",
                //position: "absolute",
                margin: "auto",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                cursor: zoomed ? "zoom-out" : "zoom-in",
                width: zoomed ? "unset" : "100%",
                height: zoomed ? "unset" : "100%",
                objectFit: zoomed ? "unset" : "contain",
            }}
            onClick={(e) => {
                if (!zoomed) {
                    const target = e.currentTarget;
                    const rect = target.getBoundingClientRect();
                    setClickedCoords([
                        (e.clientX - rect.left) / rect.width,
                        (e.clientY - rect.top) / rect.height,
                    ]);
                }
                setZoomed(!zoomed);
            }}
        />
    );
}
