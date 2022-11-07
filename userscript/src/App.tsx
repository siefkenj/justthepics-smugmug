import React from "react";
import "./App.css";
import {
    getGalleryConfig,
    getGalleryInfo,
    GalleryInfo,
    imageToThumbUrl,
    imageToLargest,
} from "./gallery-config";
import { log } from "./utils";

function App() {
    const config = React.useMemo(getGalleryConfig, []);
    const [info, setInfo] = React.useState<GalleryInfo | null>(null);
    const [status, setStatus] = React.useState("init");

    React.useEffect(() => {
        (async () => {
            setStatus("loading");
            try {
                const info = await getGalleryInfo(config);
                log("Found Gallery Info:", info);
                setInfo(info);
                setStatus("loaded");
            } catch (e) {
                setStatus("error");
                throw e;
            }
        })();
    }, [config]);

    if (!info) {
        if (status === "loading") {
            return (
                <div className="App">
                    <h3>Loading album info...</h3>
                </div>
            );
        } else if (status === "error") {
            return (
                <div className="App">
                    <h3>Failed to load album info...</h3>
                </div>
            );
        }
        return (
            <div className="App">
                <h3>Reached unknown state...</h3>
            </div>
        );
    }

    return (
        <div className="App">
            <h4>Replacement Gallery</h4>
            <div className="justthepics-gallery">
                {info.Images.map((image) => {
                    const largest = imageToLargest(image);
                    const details = image.Sizes[largest.size];
                    const canDownload =
                        image.CanDownload && !image.HasDownloadPassword;
                    let url = largest.url;
                    if (image.IsVideo) {
                        url = details.url || url;
                    }
                    if (canDownload && !image.IsVideo) {
                        // The image download url automatically prompts the browser to be downloaded.
                        // We want to view the image instead, so we need to proxy it through a special URL
                        // which gets grabbed by a different part of our script.
                        const newUrl = new URL(
                            `${window.location.protocol}//justthepics.smugmug.com`
                        );
                        newUrl.searchParams.append(
                            "proxy_url",
                            largest.downloadUrl
                        );
                        url = newUrl.href;
                    }
                    let annotation = canDownload ? "D" : largest.size;
                    if (image.IsVideo) {
                        annotation = "🎥"
                    }
                    return (
                        <a
                            href={url}
                            className={`justthepics-size-${
                                canDownload ? "D" : largest.size
                            } justthepics-link ${image.IsVideo ? "video" : ""}`}
                            key={image.ImageKey}
                        >
                            <div className="justthepics-size-annotation">
                                {annotation} {details.width}✕{details.height}
                            </div>
                            <img src={imageToThumbUrl(image)} alt="" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

export default App;
