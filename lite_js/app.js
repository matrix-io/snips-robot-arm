//////////////////////////////////////////////////////////////////////////////////////////
// INITIAL VARIABLES \\
var webControls = require(__dirname + '/webControls.js');
var everloop = require('/home/pi/lite_js/everloop.js');
var servoControl = require('/home/pi/lite_js/servo_lite.js');
var zigbeeSimple = require('/home/pi/js-matrix-core-app/toggleZigbee.js');

// Snips variables
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost', { port: 1883 });

var snipsUserName = 'sfi6zy';

var wakeword = 'hermes/hotword/default/detected';
var sessionEnd = 'hermes/dialogueManager/sessionEnded';
var robotState = 'hermes/intent/'+snipsUserName+':robotState';
var zigbeeToggle = 'hermes/intent/'+snipsUserName+':zigbeeToggle';

//////////////
//ON CONNECT//
//////////////

client.on('connect', function() {
    console.log('Connected to Snips MQTT server\n');
    client.subscribe(wakeword);
    client.subscribe(sessionEnd);
    client.subscribe(robotState);
    client.subscribe(zigbeeToggle)
});

// Arm use statuses
var armInUse = false;
var lastArmAction = 'none'

//////////////
//ON MESSAGE//
//////////////

client.on('message', function(topic,message) {

    var message = JSON.parse(message);

 //   console.log(message);

    switch(topic) {
        // * On Wakeword
        case wakeword:
            everloop.startWaiting();
            console.log('Wakeword Detected');
        break;

        // * On Robot State Change
        case robotState:
            // Turn Robot On/Off
            try{
                if (message.slots[1].rawValue === 'on' || message.slots[1].rawValue === 'up'){
                    if(lastArmAction !== 'useZigbee' && !armInUse){
                        armInUse = true;// Update boolean
                        // Pick up & turn on Zigbee bulb
                        servoControl.useZigbee(function(){
                          lastArmAction = 'useZigbee';// Update boolean
                          armInUse = false;// Update boolean
                        }, zigbeeSimple.lightsOn);
                    }
                    everloop.stopWaiting();
                    console.log('Robot On');
                }

                else{
                    if(lastArmAction !== 'removeZigbee' && !armInUse){
                        armInUse = true;// Update boolean
                        // Put down Zigbee bulb
                        servoControl.removeZigbee(function(){
                          lastArmAction = 'removeZigbee';// Update boolean
                          armInUse = false;// Update boolean
                        }, zigbeeSimple.lightsOff);
                    }
                    everloop.stopWaiting();
                    console.log('Robot Off');
                }
            }

            // Expect error if `on` or `off` is not heard
            catch(e){
                console.log('Did not receive a Robot On/Off state')
            }
        break;

        case zigbeeToggle:
            if (message.slots[0].rawValue === 'on') {
		zigbeeSimple.lightsOn();
	    } else if (message.slots[0].rawValue === 'off') {
		zigbeeSimple.lightsOff();
	    } else {
            	zigbeeSimple.lightsToggle();
	    }
            everloop.stopWaiting();
            console.log('Zigbee Light Toggled');
        break;

        // * On Conversation End
        case sessionEnd:
            everloop.stopWaiting();
            console.log('Session Ended\n');
        break;
    }
});

