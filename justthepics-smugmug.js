// ==UserScript==
// @name            justthepics-smugmug
// @namespace       http://smugmug.com
// @description     Displays the original image even when spaceball.gif tries to mess things up.
// @include         //*smugmug.com/*
// @grant           unsafeWindow
// ==/UserScript==

//alert('Hello worldfsdd!');

var NUM_PHOTOS_PER_PAGE = 200;
var MAX_POLL_COUNT = 30;
var pollCount = 0;

console = unsafeWindow.console;
console.log('running greasemonkey script');

// Check to see if we're on a smugmug page
var scripts = document.querySelectorAll('script'), script, src, m, i, foundSmugmug = false;
for (i = 0; i < scripts.length; i++) {
    script = scripts[i];
    // we're only interested in embedded scripts
    if (src = script.getAttribute('src')) {
        if (src.match(/smugmug.com/)) {
	    foundSmugmug = true;
	    break;
	}
    }
}

if (!foundSmugmug) {
	console.log("didn't find smugmug content");
	return;
}


// extends a with the attributes of b
function extend(a,b) {
    for (var k in b) {
        a[k] = b[k];
    }
    return a;
}
function copy(a) {
    return extend({},a);
}

// There are several different gallery styles a smugmug gallery could have.
// Identify them so we can do different things accordingly
function identifyGalleryType() {
    // types:
    //      ColumnOrganicView
    //      JournalView
    //      RowOrganicView
    //      SlideshowView
    //      SmugMugView

    // we can guess earlier than this check
    //if (typeof unsafeWindow.SM === "undefined") {
    //    return null;
    //}


    // Run through the scripts included on the page and use a heuristic
    // to decide new api vs. old
    var scripts = document.body.querySelectorAll('script'), script, m, params, i;
    for (i = 0; i < scripts.length; i++) {
        script = scripts[i];
        // we're only interested in embedded scripts
        if (script.getAttribute('src')) {
            continue;
        }
        var textContent = script.textContent;
        // newer API (this check needs to be first)
        m = textContent.match(/galleryConfig.*({.*?})/);
        if (m) {
            console.log('newer api', m[1]);
            params = JSON.parse(m[1]);
            console.log({type: params['galleryType'], params: params});
            return {type: params['galleryType'], params: params};
        }
        // new API
        m = textContent.match(/galleryRequestData.*({.*})/);
        if (m) {
            params = JSON.parse(m[1]);
            // find the gallery type
            m = textContent.match(/SM.Gallery.(.*)\(/);
            if (m) {
                return {type: m[1], params: params};
            }
        }
        // old API
        m = textContent.match(/.*pageDetails.*?({.*})/);
        if (m) {
            console.log('hi there!')
            params = JSON.parse(m[1])['Album'];
            return {type: "Classic", params: {albumId: params.AlbumID, albumKey: params.AlbumKey}};
        }
    }
    
    // backup check
    if (typeof unsafeWindow.photosPerPage !== "undefined") {
        return {type: "Classic"};
    }

    return null;
}


init();

function init() {
    "use strict";

    var galleryType;
    try {
        galleryType = identifyGalleryType();
    } catch (e) {
        console.log(e);
    }

    console.log('gal type', galleryType);
    if (galleryType == null) {
        return;
    }

    if (galleryType.type === "SmugMugView" || galleryType.type === "ThumbnailView" || galleryType.type === "RowOrganicView" || galleryType.type === "ColumnOrganicView" || galleryType.type === "JournalView" || galleryType.type === "Classic" || galleryType.type == "album") {
        // track all of the XMLHttpRequest's made by the real page,
        // because we want to cancel most of them
        (function(open, send) {
            unsafeWindow.XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
                if (url.match(/PageSize/) || method == 'POST') {
                    this._blockRequest = true;
                }
                open.call(this, method, url, async, user, pass);
            };
            unsafeWindow.XMLHttpRequest.prototype.send = function() {
                if (this._blockRequest) {
                    console.log('Blocked Request', this)
                    return;
                }
                send.apply(this, arguments);
            };

        })(unsafeWindow.XMLHttpRequest.prototype.open, unsafeWindow.XMLHttpRequest.prototype.send);

        var prepareURL = function(origin, params) {
            var PREFIX = "/services/api/json/1.4.0/?";
            var suffixArray = [];
            for (var k in params) {
                suffixArray.push( k + "=" + unsafeWindow.escape(params[k]));
            }
            return origin + PREFIX + suffixArray.join('&');
        };

        var params = galleryType.params;
        
        var preparePage = function (num) {
            var fetchParams = copy(params);
            extend(fetchParams, {method: "rpc.gallery.getalbum", 
                                 returnModelList: true, 
                                 PageNumber: num,
                                 PageSize: NUM_PHOTOS_PER_PAGE,
                                 //imageSizes: "O,X3,X2,XL,L,M,S,Th,Ti"});
                                 imageSizes: "O,Th"});
        
            // let's fetch stuff and see what happends
            var xhr = new XMLHttpRequest;
            xhr.open("GET", prepareURL(window.location.origin, fetchParams), true);
            xhr.onreadystatechange = function (event) {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    try {
                        var data = JSON.parse(xhr.responseText)
                        var parent = document.querySelector('.sm-gallery-images') || document.querySelector('#photos') ||document.body;
                        makeGallery(data, preparePage, parent);
                    } catch (e) {
                        console.log(e)
                    }
                }
            }
            xhr.send();
        }

        preparePage(1);
    }
}

function makeGallery(data, preparePage, parent) {
    var originalBody = parent;
    originalBody.textContent = '';
/*    try {
        originalBody = document.querySelector('.sm-gallery-images');
        originalBody.textContent = "";
    } catch (e) {
        originalBody = document.body;
        console.log('failed to delete .sm-gallery-images');
    }
*/

    console.log('got gallery data', data, originalBody);
    // create links that will load the next page in the gallery with ajax
    var createNavLinks = function (data) {
        var numLinks = data.Pagination.TotalPages;
        var pageOn = data.Pagination.PageNumber - 1;
        var container = document.createElement('div');
        var elms = [], i;
        for (i = 0; i < numLinks; i++) {
            var elm = document.createElement('a');
            if (i == pageOn) {
                elm.textContent = " #" + (i+1) + "# ";
            } else {
                elm.textContent = " " + (i+1) + " ";
            }
	    elm.setAttribute('style','letter-spacing: 0em;')
            elm.onclick = function(i){
                return function() {
                    preparePage(i + 1);
                };
            }(i);
            elms.push(elm);
        }
        for (i = 0; i < elms.length; i++) {
            container.appendChild(elms[i]);
        }
        return container;
    }

    var elms = [], i;
    var dateUpdated = Date(data.Albums[0].DateUpdated);
    var trimPrefetchURL = function(url) {
        var m = url.match(/PreFetchURL=(.*)/)
        return m[1];
    }
    var getMaxSizeAvailable = function(sizes) {
        var ret = 'O';
        var width = 0;
        for (var s in sizes) {
            if (sizes[s].usable && (sizes[s].width > width)) {
                ret = s;
                width = sizes[s].width;
            }
        }
        return ret;
    };
    for (i = 0; i < data.Images.length; i++) {
        var image = data.Images[i];
        var largestSize = getMaxSizeAvailable(image.Sizes);
        var OUrl = image.BaseUrl + "i-" + image.ImageKey + "/" + image.Serial + "/" + largestSize + "/" + image.URLFilename + "." + image.Format;
        var thumbUrl = image.BaseUrl + "i-" + image.ImageKey + "/" + image.Serial + "/Th/" + image.URLFilename + "." + image.Format;
        // Stopped working May 9, 2014
        //var OUrl = trimPrefetchURL(image.PreFetchURLs[0]);
        //var thumbUrl = trimPrefetchURL(image.PreFetchURLs[image.PreFetchURLs.length - 1]);
        
        var elm = document.createElement('img')
        elm.setAttribute('src', thumbUrl);
        elm.setAttribute('width', image.Sizes['Th'].width);
        elm.setAttribute('height', image.Sizes['Th'].height);
        var anchor = document.createElement('a')
        anchor.setAttribute('href', OUrl);
        anchor.appendChild(elm);
        elms.push(anchor);
    }
    var container = document.createDocumentFragment();
    for (i = 0; i < elms.length; i++) {
        container.appendChild(elms[i]);
    }
    originalBody.appendChild(createNavLinks(data)); 
    originalBody.appendChild(container);
    console.log('gal', container)

}


//console.log("yo!", document.body.getAttribute('class'));
var timeout = setTimeout(doReplace, 2000);

// Legacy stuff
//doReplace();

function doReplace() {
    clearTimeout(timeout);
    //since we need to be active for all url's, first figure out if we're on 
    //a smugmug page
    if(typeof(unsafeWindow.SM) != "undefined"){  //unsafeWindow.SM doesn't load fast enough anymore...
    //if(document.body.getAttribute('style').match(/smugmug/)){
            //console.log("hi!");
            
            
            //Figure out whether we are attempting to display a large image
            if( window.location.hash.match(/s=(M|L|X|XL|X\d|O)/) ){
                    //console.log("matched!")
            
                    //attempt to piece together the imgurl from the location
                    // They changed the way they do things!  This no longer works....  var imgurl = window.location.href.match(/.*\//)[0] + window.location.hash.substring(1,100)+".jpg"

                    var lightBox = document.getElementById('lightBoxImage');
                    if (!lightBox) {
                        pollCount++;
                        console.log('oops trying again ' + pollCount );
                        if (pollCount < MAX_POLL_COUNT) {
                            unsafeWindow.setTimeout(doReplace, 1000);
                        }
                        return;
                    }
                    var imgurl = lightBox.getAttribute('src');
                    if (imgurl.match(/spacer/)) {
                        var match = lightBox.getAttribute('style').match(/url\("(.*)"\)/);
                        if (match) {
                            imgurl = match[1];
                        }
                    }
                    console.log(imgurl, typeof imgurl);
                    if (!imgurl.match(/^http/)) {
                        imgurl = 'http://' + imgurl;
                    }


//                    unsafeWindow.setTimeout(function(){
//                        console.log('loaded', document.getElementById('lightBoxImage'));
//                    }, 2000);

//                    var baseURL = window.location.href.match(/.*\//)[0];
//                    var path = 'i-' + window.location.href.match(/k=(.*?)&/)[1];
//                    var imgurl = baseURL + '/' + path + '/0/O/a.jpg';
                    console.log('got url!: ' +  imgurl);
                    document.location.href = imgurl
                    //unsafeWindow.document.location.replace(imgurl)

                    //get the imgurl by waiting for the image to load and then grabbing the background property
                    //of the protected image
                    //window.setTimeout(function(){
                    //
                    //    var protectedimage = unsafeWindow.document.getElementsByClassName("protected")[0];
                    //    if( typeof(protectedimage) != "undefined" ){
                    //        var imgurl = protectedimage.style.backgroundImage;
                    //        imgurl = imgurl.substring(5, imgurl.length-2);
                    //        console.log(imgurl)
                    //        //document.location.href = imgurl
                    //    }else{
                    //        console.log("Couldn't find image")
                    //    }
                    //
                    //},10000);

            }else{     //do anythin else afterwards to make sure it doesn't interfere with the picture embiggining.


                    //adjust the galler so we have lost of images on one page 
                    unsafeWindow.photosPerPage = NUM_PHOTOS_PER_PAGE;
                    unsafeWindow.watch('photosPerPage', function( id, oldVal, newVal ){
                            //console.log( id+' attempted change from '+oldVal+' to '+newVal );

                            // you must return the new value or else the assignment will not work
                            // you can change the value of newVal if you like
                            return oldVal;
                    });
                    // unsafeWindow.unwatch('photosPerPage');

                    unsafeWindow.onload = function(){
                            // set the large image to scroll with the page
                            displayPhoto = document.getElementById('displayPhoto');
                            if (!displayPhoto) {
                                return;
                            }
                            displayPhoto.style.bottom = '0';
                            displayPhoto.style.position = 'fixed';
                            //console.log(displayPhoto)
                    };

            }
    }
}


