/*!
 * WebCodeCamJS 1.0.0 javascript Bar-Qr code decoder 
 * Author: Tóth András
 * Web: http://atandrastoth.co.uk
 * email: atandrastoth@gmail.com
 * Licensed under the MIT license
 */
var WebCodeCamJS = function(element) {
    this.Version = {
        name: 'WebCodeCamJS',
        version: '1.0.0.',
        author: 'Tóth András'
    };
    var videoSelect, lastImageSrc, con, display, w, h;
    var display = typeof element === "string" ? document.querySelector(element) : element,
        DecodeWorker = new Worker("js/DecoderWorker.js"),
        streams = {},
        camera = createAndAppendTo('<video style="position:absolute;visibility:hidden;display: none;">'),
        flipped = false,
        isStreaming = false,
        DecodeWorker = new Worker("js/DecoderWorker.js"),
        delayBool = false,
        initialized = false;
    options = {
        DecodeQRCodeRate: 5,
        DecodeBarCodeRate: 5,
        frameRate: 15,
        width: 320,
        height: 240,
        videoSource: {
            id: true,
            maxWidth: 640,
            maxHeight: 480
        },
        flipVertical: false,
        flipHorizontal: false,
        zoom: -1,
        beep: "audio/beep.mp3",
        brightness: 0,
        autoBrightnessValue: false,
        grayScale: false,
        contrast: 0,
        threshold: 0,
        sharpness: [],
        resultFunction: function(resText, lastImageSrc) {
            console.log(resText);
        },
        getUserMediaError: function() {
            console.log('getUserMediaError');
        },
        cameraError: function(error) {
            console.log(error);
        }
    };

    function init() {
        con = display.getContext("2d");
        w = options.width;
        h = options.height;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (navigator.getUserMedia) {
            if (!streams[options.videoSource.id] || !streams[options.videoSource.id].active) {
                navigator.getUserMedia({
                    video: {
                        mandatory: {
                            maxWidth: options.videoSource.maxWidth,
                            maxHeight: options.videoSource.maxHeight
                        },
                        optional: [{
                            sourceId: options.videoSource.id
                        }]
                    },
                    audio: false
                }, cameraSuccess, options.cameraError);
            } else {
                cameraSuccess(streams[options.videoSource.id]);
            }
        } else {
            options.getUserMediaError();
            return false;
        }
        return true;
    }

    function cameraSuccess(stream) {
        streams[options.videoSource.id] = stream;
        var url = window.URL || window.webkitURL;
        camera.src = url ? url.createObjectURL(stream) : stream;
        camera.play();
    }

    function cameraError(error) {
        options.cameraError(error);
        return false;
    }

    function setEventListeners() {
        camera.addEventListener("canplay", function(e) {
            if (!isStreaming) {
                if (camera.videoWidth > 0) {
                    h = camera.videoHeight / (camera.videoWidth / w);
                }
                display.setAttribute("width", w);
                display.setAttribute("height", h);
                if (options.flipHorizontal) {
                    con.scale(-1, 1);
                    con.translate(-w, 0);
                }
                if (options.flipVertical) {
                    con.scale(1, -1);
                    con.translate(0, -h);
                }
                isStreaming = true;
                if (options.DecodeQRCodeRate || options.DecodeBarCodeRate) {
                    delay();
                }
            }
        }, false);
        camera.addEventListener("play", function() {
            setInterval(function() {
                if (camera.paused || camera.ended) {
                    return;
                }
                var z = options.zoom;
                if (z < 0) {
                    z = optimalZoom();
                }
                con.drawImage(camera, (w * z - w) / -2, (h * z - h) / -2, w * z, h * z);
                var imageData = con.getImageData(0, 0, w, h);
                if (options.grayScale) {
                    imageData = grayScale(imageData);
                }
                if (options.brightness != 0 || options.autoBrightnessValue) {
                    imageData = brightness(imageData, options.brightness);
                }
                if (options.contrast != 0) {
                    imageData = contrast(imageData, options.contrast);
                }
                if (options.threshold != 0) {
                    imageData = threshold(imageData, options.threshold);
                }
                if (options.sharpness.length != 0) {
                    imageData = convolute(imageData, options.sharpness);
                }
                con.putImageData(imageData, 0, 0);
                lastImageSrc = display.toDataURL();
            }, 1E3 / options.frameRate);
        }, false);
    }

    function setCallback() {
        DecodeWorker.onmessage = function(e) {
            if (delayBool || camera.paused) {
                return;
            }
            if (e.data.success && e.data.result[0].length > 1 && e.data.result[0].indexOf("undefined") == -1) {
                beep();
                delayBool = true;
                delay();
                options.resultFunction(e.data.result[0], lastImageSrc);
            } else {
                if (e.data.finished && options.DecodeBarCodeRate) {
                    flipped = !flipped;
                    setTimeout(tryParseBarCode, 1E3 / options.DecodeBarCodeRate);
                }
            }
        };
        qrcode.callback = function(a) {
            if (delayBool || camera.paused) {
                return;
            }
            beep();
            delayBool = true;
            delay();
            options.resultFunction(a, lastImageSrc);
        };
    }

    function tryParseBarCode() {
        var flipMode = flipped == true ? "flip" : "normal";
        DecodeWorker.postMessage({
            ImageData: con.getImageData(0, 0, w, h).data,
            Width: w,
            Height: h,
            cmd: flipMode,
            DecodeNr: 1,
            LowLight: false
        });
    }

    function tryParseQRCode() {
        try {
            qrcode.decode();
        } catch (e) {
            if (!delayBool) {
                setTimeout(tryParseQRCode, 1E3 / options.DecodeQRCodeRate);
            }
        }
    }

    function delay() {
        setTimeout(cameraPlay, 500, true);
    }

    function cameraStop() {
        delayBool = true;
        camera.pause();
    }

    function cameraStopAll() {
        con.clearRect(0, 0, w, h);
        delayBool = true;
        camera.pause();
        for (var st in streams) {
            if (streams[st]) {
                streams[st].stop();
                streams[st] = null;
            }
        }
    }

    function cameraPlay(skip) {
        if (!streams[options.videoSource.id]) {
            init();
        } else {
            if (!skip) {
                cameraSuccess(streams[options.videoSource.id]);
            }
        }
        delayBool = true;
        camera.play();
        setTimeout(function() {
            delayBool = false;
            if (options.DecodeBarCodeRate) {
                tryParseBarCode();
            }
            if (options.DecodeQRCodeRate) {
                tryParseQRCode();
            }
        }, 2E3);
    }

    function optimalZoom(zoom) {
        return camera.videoHeight / h;
    }

    function getImageLightness() {
        var pixels = con.getImageData(0, 0, w, h),
            d = pixels.data,
            colorSum = 0,
            r, g, b, avg;
        for (var x = 0, len = d.length; x < len; x += 4) {
            r = d[x];
            g = d[x + 1];
            b = d[x + 2];
            avg = Math.floor((r + g + b) / 3);
            colorSum += avg;
        }
        return Math.floor(colorSum / (w * h));
    }

    function brightness(pixels, adjustment) {
        adjustment = adjustment == 0 && options.autoBrightnessValue ? options.autoBrightnessValue - getImageLightness() : adjustment;
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            d[i] += adjustment;
            d[i + 1] += adjustment;
            d[i + 2] += adjustment;
        }
        return pixels;
    }

    function grayScale(pixels) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i],
                g = d[i + 1],
                b = d[i + 2],
                v = .2126 * r + .7152 * g + .0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    }

    function contrast(pixels, contrast) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var contrast = 10,
                average = Math.round((d[i] + d[i + 1] + d[i + 2]) / 3);
            if (average > 127) {
                d[i] += d[i] / average * contrast;
                d[i + 1] += d[i + 1] / average * contrast;
                d[i + 2] += d[i + 2] / average * contrast;
            } else {
                d[i] -= d[i] / average * contrast;
                d[i + 1] -= d[i + 1] / average * contrast;
                d[i + 2] -= d[i + 2] / average * contrast;
            }
        }
        return pixels;
    }

    function threshold(pixels, threshold) {
        var average, d = pixels.data;
        for (var i = 0, len = w * h * 4; i < len; i += 4) {
            average = d[i] + d[i + 1] + d[i + 2];
            if (average < threshold) {
                d[i] = d[i + 1] = d[i + 2] = 0;
            } else {
                d[i] = d[i + 1] = d[i + 2] = 255;
            }
            d[i + 3] = 255;
        }
        return pixels;
    }

    function convolute(pixels, weights, opaque) {
        var sw = pixels.width,
            sh = pixels.height,
            w = sw,
            h = sh,
            side = Math.round(Math.sqrt(weights.length)),
            halfSide = Math.floor(side / 2),
            src = pixels.data,
            tmpCanvas = document.createElement("canvas"),
            tmpCtx = tmpCanvas.getContext("2d"),
            output = tmpCtx.createImageData(w, h),
            dst = output.data,
            alphaFac = opaque ? 1 : 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var sy = y,
                    sx = x,
                    r = 0,
                    g = 0,
                    b = 0,
                    a = 0,
                    dstOff = (y * w + x) * 4;
                for (var cy = 0; cy < side; cy++) {
                    for (var cx = 0; cx < side; cx++) {
                        var scy = sy + cy - halfSide,
                            scx = sx + cx - halfSide;
                        if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                            var srcOff = (scy * sw + scx) * 4,
                                wt = weights[cy * side + cx];
                            r += src[srcOff] * wt;
                            g += src[srcOff + 1] * wt;
                            b += src[srcOff + 2] * wt;
                            a += src[srcOff + 3] * wt;
                        }
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    function beep() {
        if (typeof options.beep === "string") {
            setTimeout(function() {
                (new Audio(options.beep)).play();
            }, 0);
        }
    }

    function mergeRecursive(obj1, obj2) {
        for (var p in obj2) {
            try {
                if (obj2[p].constructor == Object) {
                    obj1[p] = mergeRecursive(obj1[p], obj2[p]);
                } else {
                    obj1[p] = obj2[p];
                }
            } catch (e) {
                obj1[p] = obj2[p];
            }
        }
        return obj1;
    }

    function createAndAppendTo(innerhtml, appendTo) {
        var item = document.createElement("div");
        if (innerhtml) {
            item.innerHTML = innerhtml;
        }
        if (appendTo) {
            appendTo.appendChild(item.children[0]);
            return item;
        }
        return item.children[0];
    }

    function gotSources(sourceInfos) {
        for (var i = 0; i !== sourceInfos.length; ++i) {
            var sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === "video") {
                var face = sourceInfo.facing === "" ? "unknown" : sourceInfo.facing;
                var text = sourceInfo.label || "camera " + (videoSelect.length + 1) + " (facing: " + face + ")";
                createAndAppendTo('<option value="' + sourceInfo.id + '">' + text + '</option>', videoSelect)
            }
        }
        options.videoSource.id = videoSelect.children[0].value;
    }

    function buildSelectMenu(selector) {
        videoSelect = document.querySelector(selector);
        if (typeof MediaStreamTrack.getSources !== "undefined") {
            videoSelect.addEventListener("change", function(event) {
                options.videoSource.id = videoSelect.selectedOptions[0].value;
                cameraStop();
                cameraPlay();
            }, false);
            MediaStreamTrack.getSources(gotSources);
        } else {
            videoSelect.remove();
        }
    }
    return {
        init: function(opt) {
            if (initialized) {
                return this;
            }
            if (!display || display.tagName.toLowerCase() !== "canvas") {
                console.log("Element type must be canvas!");
                alert("Element type must be canvas!");
                return false;
            }
            qrcode.sourceCanvas = display;
            if (opt) {
                options = mergeRecursive(options, opt);
            }
            if (init()) {
                initialized = true;
                setEventListeners();
                if (options.DecodeQRCodeRate || options.DecodeBarCodeRate) {
                    setCallback();
                }
            }
            return this;
        },
        buildSelectMenu: function(selector) {
            buildSelectMenu(selector);
            return this;
        },
        cameraStop: function() {
            cameraStop();
            return this;
        },
        cameraStopAll: function() {
            cameraStopAll();
            return this;
        },
        cameraPlay: function(skip) {
            cameraPlay(skip);
            return this;
        },
        getLastImageSrc: function() {
            return lastImageSrc;
        },
        isInitialized: function() {
            return initialized;
        },
        options: options
    };
};
