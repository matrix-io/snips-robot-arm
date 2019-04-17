var matrix = require('@matrix-io/matrix-lite');

// Set Servo Angle pin 3
matrix.gpio.setFunction(3, 'PWM');
matrix.gpio.setMode(3, 'output');
matrix.gpio.setServoAngle({
  pin: 3,
  angle: 240,
  // minimum pulse width for a PWM wave (in milliseconds)
  min_pulse_ms: 0.83
});
