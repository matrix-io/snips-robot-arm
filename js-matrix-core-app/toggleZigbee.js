/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set Initial Variables \\
var fs = require('fs');// File system library
var zmq = require('zeromq');// Asynchronous Messaging Framework
var matrix_io = require('matrix-protos').matrix_io;// Protocol Buffers for MATRIX function
var matrix_ip = '127.0.0.1';// Local IP
var matrix_zigbee_base_port = 40001;// Port for Zigbee driver
var networkCommands = matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes;// Network Command Types
var networkStatuses = matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkStatus// Network Status
var gateway_is_active = false;// Bool to hold Gateway CLI Tool ON status
var gateway_is_restarting = false// Bool to hold Gateway CLI Tool ON status
// If missing, create JSON file to store Zigbee devices
if (!fs.existsSync('/home/pi/js-matrix-core-app/devices.json')){
  console.log('devices.json was not found!');
  process.exit(1);
}
// Import Devices.json as an object
console.log('\nLoaded .json file with your Zigbee devices.\n');
var zigbeeDevices = JSON.parse(fs.readFileSync('/home/pi/js-matrix-core-app/devices.json')); // Holds registered Zigbee Devices

// Create driver configuration for Zigbee network
var zb_network_msg = matrix_io.malos.v1.driver.DriverConfig.create({
    zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
      type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.NETWORK_MGMT,
      networkMgmtCmd: matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.create({
        type: matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.PERMIT_JOIN,
      })
    })
  });

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// BASE PORT \\
// Create a Pusher socket
var configSocket = zmq.socket('push');
// Connect Pusher to Base port
configSocket.connect('tcp://' + matrix_ip + ':' + matrix_zigbee_base_port);
// Create driver configuration for updates/timeouts
var config = matrix_io.malos.v1.driver.DriverConfig.create({
  // Update rate configuration
  delayBetweenUpdates: 1.0,// 2 seconds between updates
  timeoutAfterLastPing: 6.0,// Stop sending updates 6 seconds after last ping.
});
// Send initial driver configuration
configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish());

setTimeout(isGatewayActive, 3000);


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// KEEP-ALIVE PORT \\
// Create a Pusher socket
var pingSocket = zmq.socket('push');
// Connect Pusher to Keep-alive port
pingSocket.connect('tcp://' + matrix_ip + ':' + (matrix_zigbee_base_port + 1));
// Send initial ping
pingSocket.send('');
// Send a ping every second
setInterval(function(){
  pingSocket.send('');
}, 1000);

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERROR PORT \\
// Create a Subscriber socket
var errorSocket = zmq.socket('sub');
// Connect Subscriber to Error port
errorSocket.connect('tcp://' + matrix_ip + ':' + (matrix_zigbee_base_port + 2));
// Connect Subscriber to Error port
errorSocket.subscribe('');
// On Message
errorSocket.on('message', function(error_message){
  console.log('Received Message: ' + error_message.toString('utf8'));// Log error
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// DATA UPDATE PORT \\
// Create a Subscriber socket
var updateSocket = zmq.socket('sub');
// Connect Subscriber to Data Update port
updateSocket.connect('tcp://' + matrix_ip + ':' + (matrix_zigbee_base_port + 3));
// Subscribe to messages
updateSocket.subscribe('');
// On Message
updateSocket.on('message', function(buffer){
  var data = matrix_io.malos.v1.comm.ZigBeeMsg.decode(buffer);// Extract message
  //console.log(data);
  // If gateway active and network status is requested
  if(gateway_is_active && zb_network_msg.zigbeeMessage.networkMgmtCmd.type === networkCommands.NETWORK_STATUS){
    // Switch Cases For Network Statuses
    switch(data.networkMgmtCmd.networkStatus.type){
      //* IF NO NETWORK
      case networkStatuses.Status.NO_NETWORK:
        console.log('No Network');
        process.exit(1);// Exit application
        break;
      //* IF JOINING NETWORK
      case networkStatuses.Status.JOINING_NETWORK:
        console.log('Joining Network');
        break;
      //* IF JOINED NETWORK
      case networkStatuses.Status.JOINED_NETWORK:
        console.log('Joined Existing Network\n');
        //sendAllToggleCommand();
        break;
    }
  }
  // Check if Gateway tool restarted
  else if(gateway_is_active === false){
    // If Gateway tool is active
    if(data.networkMgmtCmd.isProxyActive){
      gateway_is_active = true;// update boolean
      console.log('Gateway CLI Tool is active.');// Log status
      // Add request for Zigbee Network Status in configuration
      zb_network_msg.zigbeeMessage.networkMgmtCmd.type = networkCommands.NETWORK_STATUS;
      // Send configuration
      configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
    }
    // If Gateway CLI Tool is down
    else if (gateway_is_restarting === false){
      gateway_is_restarting = true;// update boolean
      console.log('Gateway CLI Tool Is Offline. Please wait 10 seconds for restart.');// Log status
      resetGateway( setTimeout(isGatewayActive, 10000) );// Restart Gateway
    }
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// FUNCTIONS \\
// - Restart Zigbee CLI tool called Gateway (optional, but ensures tool is running)
function resetGateway(callback) {
  console.log('Restarting Gateway Tool.\n');
  // Define configuration message as Reset
  zb_network_msg.zigbeeMessage.networkMgmtCmd.type = matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.RESET_PROXY;
  // Send configuration to Base Port
  configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
  // Run callback if defined
  if(callback)
    callback;
}
// - Ask for Gateway status through Data port
function isGatewayActive() {
  // Log that connection is being tested
  console.log('Checking connection with the Gateway');
  // Save Gateway status request to configuration 
  zb_network_msg.zigbeeMessage.networkMgmtCmd.type = matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.IS_PROXY_ACTIVE;
  // Send configuration to Base port
  configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
}

// - Toggle each zigbee device on & off
function sendAllToggleCommand(){
  for(device in zigbeeDevices){
    console.log('Sent Zigbee toggle message to ' + device);
    var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
      zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
        type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
        zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.ON_OFF,
          onoffCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.create({
            type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.TOGGLE
          }),
          nodeId: zigbeeDevices[device].node_id,
          endpointIndex: zigbeeDevices[device].endpoint_index
        })
      })
    });
    configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_toggle_msg).finish());
  }
}

// - Toggle each zigbee device on & off
function sendAllOffCommand(){
  for(device in zigbeeDevices){
    console.log('Sent Zigbee toggle message to ' + device);
    var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
      zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
        type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
        zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.ON_OFF,
          onoffCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.create({
            type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.OFF
          }),
          nodeId: zigbeeDevices[device].node_id,
          endpointIndex: zigbeeDevices[device].endpoint_index
        })
      })
    });
    configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_toggle_msg).finish());
  }
}

// - Toggle each zigbee device on & off
function sendAllOnCommand(){
  for(device in zigbeeDevices){
    console.log('Sent Zigbee toggle message to ' + device);
    var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
      zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
        type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
        zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.ON_OFF,
          onoffCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.create({
            type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.ON
          }),
          nodeId: zigbeeDevices[device].node_id,
          endpointIndex: zigbeeDevices[device].endpoint_index
        })
      })
    });
    configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_toggle_msg).finish());
  }
}

// Export functions for app.js
module.exports = {
    lightsToggle: function() {sendAllToggleCommand()},
    lightsOn: function() {sendAllOnCommand()},
    lightsOff: function(){sendAllOffCommand()}
}

//setInterval(function(){
//  sendAllToggleCommand();
//}, 1000)
