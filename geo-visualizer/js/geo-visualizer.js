"use strict";

var sliderTime = document.getElementById("sliderTime");
var spanTime = document.getElementById("spanTime");
var btnAnimate = document.getElementById("btnAnimate");

var layer = L.geoJson.ajax("https://cors-anywhere.herokuapp.com/https://gisweb02.z6.web.core.windows.net/Points.json");
var buckets = [];
var bucketCount = 100;
var intervalMs = 500;
var intervalHandle;
var lastShownLayer = null;

var map = L.map("map").setView([51.505, -0.09], 13);

layer.on("data:loaded", function(data) {
    var layerBounds = layer.getBounds();
    map.fitBounds(layerBounds);
    L.tileLayer("https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.thunderforest.com/terms/">Thunderforest</a> contributors'
    }).addTo(map);

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
    
    // Pack array to avoid empty indices
    var targetIndex = 0;
    for (var i = 0; i < buckets.length; ++i) {
        if (buckets[i]) {
            buckets[targetIndex++] = buckets[i];
        }
    }
    buckets.length = targetIndex;
    
    sliderTime.min = 0;
    sliderTime.max = buckets.length - 1;
    
    toggleAnimation();
});

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
        if (currentBucket >= buckets.length) {
            toggleAnimation();
        }
    }, intervalMs);
}

function showLayerIndex(index) {
    if (lastShownLayer) {
        map.removeLayer(lastShownLayer);
    }
    
    if (buckets[index]) {
        lastShownLayer = L.geoJson(buckets[index]);
        map.addLayer(lastShownLayer);
    } else {
        lastShownLayer = null;
    }

    spanTime.innerHTML = new Date(buckets[index].time);
}

function sliderTimeChanged() {
    stopAnimation();
    showLayerIndex(sliderTime.value);
}

function btnAnimateClicked() {
    toggleAnimation();
}