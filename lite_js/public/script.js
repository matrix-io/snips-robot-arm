var socket = io();//auto-discovery
$(document).ready(function() {
//////////////////////
///Event Listeners
/////////////////////
	//logs current users
	socket.on("clients connected",function(users){});

//////////////////////
///Navigation Setup
/////////////////////
	$("#numpad-layout").show();//unhide initial content
	
	$('#light-on').on('click', function(){socket.emit('light_on');});
	$('#light-off').on('click', function(){socket.emit('light_off');});
	$('#luxo-on').on('click', function(){socket.emit('luxo_on');});
	$('#luxo-off').on('click', function(){socket.emit('luxo_off');});

	$('#nav-item2').on('click', function(){changeLayout('#nav-item2','#controls-layout');});

//////////////////////
///Button Setup 
/////////////////////
	// Servo Slider Setup
	for( let i = 0; i < 6; i++){
		$('#servo-'+i).on('input', function(){
			// Update html value
			$('#servo-'+i+'-val').html($('#servo-'+i).val());
			// Send value to server
			socket.emit('servoSet', {
				'servo_num': i,
				'value': parseInt($('#servo-'+i).val(),10)
			});
		});
	}
});


