import { logFetch } from "./utils";

interface GalleryConfig {
    breadcrumbs: { name: string; url: string }[];
    container: string;
    enablePrefetching: boolean;
    galleryImageSourceUri: string;
    galleryRequestData: {
        albumId: number;
        albumKey: string;
        galleryType: string;
        nodeId: string;
    };
    galleryType: string;
    largestSize: string;
    private: boolean;
}

export function getGalleryConfig() {
    for (const script of Array.from(document.querySelectorAll("script"))) {
        const text = script.innerText;
        const match = text.match(/galleryConfig = ({[^;]*});/);
        if (match) {
            return JSON.parse(match[1]) as GalleryConfig;
        }
    }
    throw new Error("Could not find galleryConfig");
}

export async function getGalleryInfo(config: GalleryConfig) {
    const reqData = config.galleryRequestData;
    const url = `/services/api/json/1.4.0/?galleryType=album&albumId=${reqData.albumId}&albumKey=${reqData.albumKey}&nodeId=${reqData.nodeId}&PageNumber=0&returnModelList=true&PageSize=3000&method=rpc.gallery.getalbum`;
    const resp = await logFetch(url);
    return (await resp.json()) as GalleryInfo;
}

export function imageToThumbUrl(image: Image) {
    const url = `${image.BaseUrl}i-${image.ImageKey}/${image.Serial}/${image.UrlSignature}/Th/${image.URLFilename}-Th.jpg`;
    return url;
}

export function imageToLargest(image: Image) {
    const size = getLargestImageSize(image);
    const url = `${image.BaseUrl}i-${image.ImageKey}/${image.Serial}/${image.UrlSignature}/${size}/${image.URLFilename}.jpg`;
    const downloadUrl = `${image.BaseUrl}i-${image.ImageKey}/${image.Serial}/${image.UrlSignature}/D/${image.URLFilename}.jpg`;
    return { size, url, downloadUrl };
}

function getLargestImageSize(image: Image) {
    let largestWidth = 0;
    let largestSize = "Th";
    for (const [size, details] of Object.entries(image.Sizes)) {
        if (details.usable && details.width > largestWidth) {
            largestWidth = details.width;
            largestSize = size;
        }
    }
    return largestSize as SizeKeys;
}

interface Album {
    AlbumID: number;
    AlbumKey: string;
    AllowDownloads: boolean;
    Title: string;
    Description: string;
    DescriptionText: string;
    DownloadPassword: string;
    External: boolean;
    BatchDownloadConfig: null;
    CanCollect: boolean;
    FamilyEdit: boolean;
    CanFavorite: boolean;
    FriendEdit: boolean;
    CanQuickShare: boolean;
    CanRank: boolean;
    CanSave: boolean;
    CanShare: boolean;
    FavoriteAlbumId: number;
    FavoriteAlbumKey: string;
    FavoriteAlbumUrl: string;
    Geography: boolean;
    HasDownloadPassword: boolean;
    HasImages: boolean;
    HideOwner: boolean;
    LargestSize: string;
    IsOwner: boolean;
    IsAssistant: boolean;
    IsFamily: boolean;
    IsFriend: boolean;
    Printable: boolean;
    CommerceLightbox: boolean;
    IsSellable: boolean;
    NickName: string;
    Protected: boolean;
    ShowPopular: boolean;
    EXIF: boolean;
    SquareThumbs: boolean;
    Comments: boolean;
    Filenames: boolean;
    DateUpdated: string;
    URL: string;
    HighlightImageID: number;
    ShowKeywords: boolean;
    GuestUploadURL: string;
    TemplateID: number;
    Slideshow: boolean;
    IsPrivate: boolean;
    IsSystemAlbum: boolean;
    SecurityType: number;
    EffectiveSecurityType: number;
}

type SizeKeys =
    | "O"
    | "5K"
    | "4K"
    | "X5"
    | "X4"
    | "X3"
    | "X2"
    | "X1"
    | "XL"
    | "L"
    | "M"
    | "S"
    | "Th"
    | "Ti";

interface Size {
    usable: boolean;
    cold: boolean;
    width: number;
    height: number;
    ext: string;
}
type Sizes = { [key in SizeKeys]: Size };
interface Image {
    ImageID: number;
    ImageKey: string;
    Title: string;
    NewKey: boolean;
    AlbumID: number;
    AlbumKey: string;
    Status: string;
    Format: string;
    External: boolean;
    IsProtected: boolean;
    IsSellable: boolean;
    CanWatermark: boolean;
    Serial: number;
    FileName: string;
    ShowFileName: boolean;
    SEOFilename: string;
    URLFilename: string;
    Latitude: number;
    Longitude: number;
    Sizes: Sizes;
    BaseUrl: string;
    IsFavorite: boolean;
    IsVault: boolean;
    IsArchive: boolean;
    ArchiveUrl: string;
    IsVideo: boolean;
    IsEZProject: boolean;
    Caption: string;
    CaptionRaw: string;
    CaptionText: string;
    Keywords: [];
    ShowKeywords: boolean;
    CanBuy: boolean;
    CanCollect: boolean;
    CanComment: boolean;
    CanDownload: boolean;
    HasDownloadPassword: boolean;
    CanEdit: boolean;
    CanRemove: boolean;
    CanMap: boolean;
    CanFavorite: boolean;
    GalleryUrl: string;
    LightboxUrl: string;
    IsOwner: boolean;
    CanShare: boolean;
    ShowEXIF: boolean;
    CanRank: boolean;
    Liked: boolean;
    Origin: "Album";
    OriginalWidth: number;
    OriginalHeight: number;
    Watermarked: null;
    WatermarkedSizes: SizeKeys[];
    UrlSignature: string;
    IsPrivate: boolean;
    Index: number;
}

export interface GalleryInfo {
    stat: string;
    method: string;
    Albums: Album[];
    Images: Image[];
    NextImageUrl: null;
    PrevImageUrl: string;
    NextImageKey: null;
    PrevImageKey: string;
    Pagination: {
        PageNumber: number;
        PageSize: number;
        TotalItems: number;
        TotalPages: number;
        ItemsOnPage: number;
        PreviousImage: number;
        NextImage: number;
    };
}
