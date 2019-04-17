var matrix = require("@matrix-io/matrix-lite");

var pins = [1,3,5,9,7,11];
var min_pulse = 0.83;

// Set Servo Angle
function setServo(pinNum, desAngle){
    matrix.gpio.setFunction(pinNum, 'PWM');
    matrix.gpio.setMode(pinNum, 'output');

    //Adjust depending on servo type
    if (pinNum > 5) {
      min_pulse = 0.5;
    } else {
      min_pulse = 0.83;
    }

    matrix.gpio.setServoAngle({
    pin: pinNum,
    angle: desAngle,
    // minimum pulse width for a PWM wave (in milliseconds)
    min_pulse_ms: min_pulse
    });
    console.log("setting servo");
}

// EXPORT FUNCTIONS \\
module.exports = {
  set: function(pin,angle){setServo(pin, angle)},
  setWeb: function(pin,angle){setServo(pins[pin], angle)},
  useZigbee: function(callback, zigbeeFunction){luxoUpAnimation(callback, zigbeeFunction)},
  removeZigbee: function(callback, zigbeeFunction){luxoDownAnimation(callback, zigbeeFunction)}
}

// FUNCTIONS \\
// - Pointed up like a tree position
function restPosition(callback, adjustForBulb = true){
  // Open claw
  setServo(pins[5], 50); //30
  setTimeout(function(){
    // Adjust wrist if needed(avoids hitting light bulb)
    if(adjustForBulb){
      setServo(pins[3],40);
    }
    // Lift each servo above pin[1]
    setTimeout(function(){
      // Begin moving to
      setServo(pins[2],90);
      setServo(pins[4],90);  //176
      // Adjust wrist if needed(avoids hitting light bulb)
      if(adjustForBulb){
        setTimeout(()=>{setServo(pins[3],149);}, 300); //149
      }
      else{
        setServo(pins[3],149); //149
      }
      // Lift from base
      setTimeout(function(){
        setServo(pins[1],180);
        setTimeout(function(){
          setServo(pins[0],180);
          // Callback after specified seconds (if defined)
          setTimeout(function(){if(callback){callback()};},1000);
        },300);
      },500);
    },200);
  },300);
}

//restPosition();
// grabPosition();
// luxoUpAnimation();
// luxoDownAnimation();

// Grab
function grabPosition(callback){
  // Set to grabbing position
  setServo(pins[0],187);
  setServo(pins[1],167);
  setServo(pins[2],220); 
  setServo(pins[3],50);
  setServo(pins[4],165);
  // Adjust claw
  setTimeout(function(){setServo(pins[3],87);},1500);//used to be 98
  // Close claw
  setTimeout(function(){setServo(pins[5],80);},2500);
  // Callback after 5 seconds (if defined)
  setTimeout(function(){if(callback){callback()};},4000);
}

// - Luxo animation to show off Zigbee light bulb
function luxoUpAnimation(callback, zigbeeFunction){
  restPosition(function(){
    grabPosition(function(){
      // Lift light bulb
      setServo(pins[0],184);
      setServo(pins[2],188);
      setServo(pins[3],92);
      setTimeout(function(){
        setServo(pins[1],235);
      },500);

      setTimeout(function(){
        // Rotate Head
        setServo(pins[4],86);
        // Turn on Zigbee bulb
        setTimeout(()=>{if(zigbeeFunction){zigbeeFunction()};}, 150);
        // Callback after 5 seconds (if defined)
        setTimeout(function(){if(callback){callback()};},3000);
      },2000);
    });
  }, false);
}

// - Animation to place light bulb on the ground and reset
function luxoDownAnimation(callback, zigbeeFunction){
  // Set to grabbing position
  setServo(pins[2],220);
  setServo(pins[3],30);
  setServo(pins[4],165);

  // Turn off Zigbee bulb
  if(zigbeeFunction){zigbeeFunction()};
  
  // Finish setting to grabbing position
  setTimeout(()=>{
    setServo(pins[0],187);
    setServo(pins[1],167);
  },500);

  // Adjust claw before drop
  setTimeout(function(){setServo(pins[3],65);},1500);
  setTimeout(function(){
    setServo(pins[3],87);
    setServo(pins[4],162);
  },2500);
  // Open claw & drop light bulb
  setTimeout(function(){setServo(pins[5],50);},4000);
  // Callback after 5 seconds (if defined)
  setTimeout(function(){
    restPosition();
    if(callback){callback()};
  },5000);
}
