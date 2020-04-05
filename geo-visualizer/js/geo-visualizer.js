"use strict";

var sliderTime = document.getElementById("sliderTime");
var spanTime = document.getElementById("spanTime");
var btnAnimate = document.getElementById("btnAnimate");

var intervalMs = 500;
var intervalHandle;
var lastShownLayer = null;
var layers;

// Map initialization, including background raster map

var map = L.map("map").setView([32, 36], 8);
L.tileLayer("https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.thunderforest.com/terms/">Thunderforest</a> contributors'
}).addTo(map);

// Initialization

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("servicebase")) {
    // Use Python server: Load all layers from Python server
    
    var serviceBase = urlParams.get("servicebase");
    ajax(serviceBase + "/timeRange", "json").then(function(timeRangeRequest) {
        var bucketsLoaded = 0;
        var allLayersBounds = new L.LatLngBounds();
        var buckets = new Array(timeRangeRequest.response.bucketsMetadata.length);
        for (var i = 0; i < timeRangeRequest.response.bucketsMetadata.length; ++i) {
            var bucket = L.geoJson.ajax(serviceBase + "/pointsByTimeBucket/" + i);
            buckets[i] = bucket;
            bucket.on("data:loaded", getBucketLoadedCallback(bucket));
        }

        function getBucketLoadedCallback(bucketInClosure) {
            var isAlreadyLoaded = false;
            return function() {
                if (isAlreadyLoaded) {
                    return;
                }
                isAlreadyLoaded = true;
                
                ++bucketsLoaded;
                allLayersBounds = allLayersBounds.extend(bucketInClosure.getBounds());
                if (bucketsLoaded === timeRangeRequest.response.bucketsMetadata.length) {
                    loadMap(buckets, allLayersBounds);
                }
            };
        }
    });
} else {
    // Default behavior if no python service
    
    var buckets = [];
    var bucketCount = 100;
    var layer = L.geoJson.ajax("https://cors-anywhere.herokuapp.com/https://gisweb02.z6.web.core.windows.net/Points.json");

    layer.on("data:loaded", function(data) {
        // Find min and max time
        var minTime, maxTime;
        for (var i in data.target._layers) {
            if (!data.target._layers[i]) {
                continue;
            }
            
            var props = data.target._layers[i].feature.properties;
            if ((!minTime) || (props.fromTime < minTime)) {
                minTime = props.fromTime;
            }
            if ((!maxTime) || (props.toTime > maxTime)) {
                maxTime = props.toTime;
            }
        }
        
        // Create bucket per time slice
        var bucketSize = (maxTime - minTime) / bucketCount;
        for (var i in data.target._layers) {
            var featureLayer = data.target._layers[i];
            if (!featureLayer) {
                continue;
            }
            
            var props = featureLayer.feature.properties;
            var fromBucket = Math.floor((props.fromTime - minTime) / bucketSize);
            var toBucket = Math.ceil((props.toTime - minTime) / bucketSize);
            for (var j = fromBucket; j <= toBucket; ++j) {
                if (!buckets[j]) {
                    buckets[j] = [];
                    buckets[j].time = minTime + (j + 0.5) * bucketSize
                }
                buckets[j].push(featureLayer.feature);
            }
        }
        
        // Pack array to avoid empty indices, and wrap with L.geoJson
        var targetIndex = 0;
        for (var i = 0; i < buckets.length; ++i) {
            if (buckets[i]) {
                buckets[targetIndex++] = L.geoJson(buckets[i]);
            }
        }
        buckets.length = targetIndex;
        
        loadMap(buckets, layer.getBounds());
    });
}

// UI logic to swap layers

function loadMap(buckets, bounds) {        
    map.fitBounds(bounds);

    sliderTime.min = 0;
    sliderTime.max = buckets.length - 1;
    
    layers = buckets;
    toggleAnimation();
}

function stopAnimation() {
    if (!intervalHandle) {
        return false;
    }
    
    clearInterval(intervalHandle);
    intervalHandle = null;
    btnAnimate.value = "Animate";
    return true;
}

function toggleAnimation() {
    if (stopAnimation()) {
        return;
    }
    
    var currentBucket = 0;

    btnAnimate.value = "Stop animation";
    intervalHandle = setInterval(function() {
        sliderTime.value = currentBucket;
        
        showLayerIndex(currentBucket);
        
        ++currentBucket;
        if (currentBucket >= layers.length) {
            toggleAnimation();
        }
    }, intervalMs);
}

function showLayerIndex(index) {
    if (lastShownLayer) {
        map.removeLayer(lastShownLayer);
    }
    
    if (layers[index]) {
        lastShownLayer = layers[index];
        map.addLayer(lastShownLayer);
    } else {
        lastShownLayer = null;
    }

    spanTime.innerHTML = new Date(layers[index].time);
}

function sliderTimeChanged() {
    stopAnimation();
    showLayerIndex(sliderTime.value);
}

function btnAnimateClicked() {
    toggleAnimation();
}