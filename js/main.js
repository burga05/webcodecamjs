/*!
 * WebCodeCamJS 1.0.0 javascript Bar-Qr code decoder 
 * Author: Tóth András
 * Web: http://atandrastoth.co.uk
 * email: atandrastoth@gmail.com
 * Licensed under the MIT license
 */
(function(undefined) {
    var Q = function(sel) {
        var els = document.querySelectorAll(sel);
        return els.length > 1 ? els : els[0];
    };
    var txt = "innerText" in HTMLElement.prototype ? "innerText" : "textContent";
    var sl = Q(".scanner-laser"),
        pl = Q("#play"),
        si = Q("#scanned-img"),
        sQ = Q("#scanned-QR"),
        sv = Q("#save"),
        sp = Q("#stop"),
        spAll = Q("#stopAll"),
        co = Q("#contrast"),
        cov = Q("#contrast-value"),
        zo = Q("#zoom"),
        zov = Q("#zoom-value"),
        br = Q("#brightness"),
        brv = Q("#brightness-value"),
        tr = Q("#threshold"),
        trv = Q("#threshold-value"),
        sh = Q("#sharpness"),
        shv = Q("#sharpness-value"),
        gr = Q("#grayscale"),
        grv = Q("#grayscale-value");
    var args = {
        autoBrightnessValue: 100,
        resultFunction: function(text, imgSrc) {
            [].forEach.call(sl, function(el) {
                fadeOut(el, .5);
                setTimeout(function() {
                    fadeIn(el, .5);
                }, 300);
            });
            si.setAttribute("src", imgSrc);
            sQ[txt] = text;
        },
        getUserMediaError: function() {
            alert("Sorry, the browser you are using doesn't support getUserMedia");
        },
        cameraError: function(error) {
            var p, message = "Error detected with the following parameters:\n";
            for (p in error) {
                message += p + ": " + error[p] + "\n";
            }
            alert(message);
        }
    };
    var decoder = new WebCodeCamJS("#webcodecam-canvas");
    decoder.buildSelectMenu("select#cameraId");
    pl.addEventListener("click", function() {
        if (!decoder.isInitialized()) {
            decoder.init(args);
            sQ[txt] = "Scanning ...";
            sv.classList.remove("disabled");
            sp.addEventListener("click", function(event) {
                sv.classList.add("disabled");
                sQ[txt] = "Stopped";
                decoder.cameraStop();
            }, false);
            spAll.addEventListener("click", function(event) {
                sv.classList.add("disabled");
                sQ[txt] = "Stopped";
                decoder.cameraStopAll();
            }, false);
        } else {
            sv.classList.remove("disabled");
            sQ[txt] = "Scanning ...";
            decoder.cameraPlay();
        }
    }, false);
    sv.addEventListener("click", function() {
        if (!decoder.isInitialized()) {
            return;
        }
        var src = decoder.getLastImageSrc();
        si.setAttribute("src", src);
    }, false);
    Page.changeZoom = function(a) {
        if (!decoder.isInitialized()) {
            return;
        }
        var value = typeof a !== "undefined" ? parseFloat(a.toPrecision(2)) : zo.value / 10;
        zov[txt] = zov[txt].split(":")[0] + ": " + value.toString();
        decoder.options.zoom = parseFloat(value);
        if (typeof a != "undefined") {
            zo.value = a * 10;
        }
    };
    Page.changeContrast = function() {
        if (!decoder.isInitialized()) {
            return;
        }
        var value = co.value;
        cov[txt] = cov[txt].split(":")[0] + ": " + value.toString();
        decoder.options.contrast = parseFloat(value);
    };
    Page.changeBrightness = function() {
        if (!decoder.isInitialized()) {
            return;
        }
        var value = br.value;
        brv[txt] = brv[txt].split(":")[0] + ": " + value.toString();
        decoder.options.brightness = parseFloat(value);
    };
    Page.changeThreshold = function() {
        if (!decoder.isInitialized()) {
            return;
        }
        var value = tr.value;
        trv[txt] = trv[txt].split(":")[0] + ": " + value.toString();
        decoder.options.threshold = parseFloat(value);
    };
    Page.changeSharpness = function() {
        if (!decoder.isInitialized()) {
            return;
        }
        var value = sh["checked"];
        if (value) {
            shv[txt] = shv[txt].split(":")[0] + ": on";
            decoder.options.sharpness = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        } else {
            shv[txt] = shv[txt].split(":")[0] + ": off";
            decoder.options.sharpness = [];
        }
    };
    Page.changeGrayscale = function() {
        if (!decoder.isInitialized()) {
            return;
        }
        var value = gr["checked"];
        if (value) {
            grv[txt] = grv[txt].split(":")[0] + ": on";
            decoder.options.grayScale = true;
        } else {
            grv[txt] = grv[txt].split(":")[0] + ": off";
            decoder.options.grayScale = false;
        }
    };
    var getZomm = setInterval(function() {
        var a;
        try {
            a = decoder.optimalZoom();
        } catch (e) {
            a = 0;
        }
        if (a != 0) {
            Page.changeZoom(a);
            clearInterval(getZomm);
        }
    }, 500);

    function fadeOut(el, v) {
        el.style.opacity = 1;
        (function fade() {
            if ((el.style.opacity -= .1) < v) {
                el.style.display = "none";
                el.classList.add("is-hidden");
            } else {
                requestAnimationFrame(fade);
            }
        })();
    }

    function fadeIn(el, v, display) {
        if (el.classList.contains("is-hidden")) {
            el.classList.remove("is-hidden");
        }
        el.style.opacity = 0;
        el.style.display = display || "block";
        (function fade() {
            var val = parseFloat(el.style.opacity);
            if (!((val += .1) > v)) {
                el.style.opacity = val;
                requestAnimationFrame(fade);
            }
        })();
    }
}).call(window.Page = window.Page || {});