const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const servo = require(__dirname+'/servo_lite.js');
var servoControl = require('/home/pi/lite_js/servo_lite.js');
var zigbeeSimple = require('/home/pi/js-matrix-core-app/toggleZigbee.js');

// Define Website Folder
app.use(express.static(__dirname + '/public'));
// Server Set Up
let port = 8000;
http.listen(port, () => { console.log('Server Initiated'); });

// Socket Connection
io.on('connection', (socket) => {
    // On Connect
    console.log('A user has connected');
    
    // On Disconnect
    socket.on('disconnect', () => {
        console.log('A user has disconnected');
    });

    // On Servo Position Change
    socket.on('servoSet', (data) => {
        servo.setWeb(data.servo_num, data.value);
    });

    // On zigbee change
    socket.on('light_on', (data) => {
        zigbeeSimple.lightsOn();
    });

    socket.on('light_off', (data) => {
        zigbeeSimple.lightsOff();
    });

    socket.on('luxo_on', (data) => {
        servoControl.useZigbee(function(){}, zigbeeSimple.lightsOn);
    });

    socket.on('luxo_off', (data) => {
        servoControl.removeZigbee(function(){}, zigbeeSimple.lightsOff);
    });
});