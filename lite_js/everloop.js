var matrix = require("@matrix-io/matrix-lite");

var methods = {};// Declaration of method controls at the end

var waitingToggle = false;

var counter = 0;


setInterval(function(){
    
    // Turns off all LEDs
    if (waitingToggle == false) {
        matrix.led.set();
    };

    // Creates pulsing LED effect
    if (waitingToggle == true) {
        matrix.led.set({r:0, g:0, b:(Math.round((Math.sin(counter) + 1) * 100) + 10), w:0});
        counter = counter + 0.2;
    };

},50);

///////////////////
//WAITING METHODS//
///////////////////

methods.startWaiting = function() {
    waitingToggle = true;
};

methods.stopWaiting = function() {
    waitingToggle = false;
};

module.exports = methods;// Export methods in order to make them avaialble to other files