/* general use */
function error(msg) {
  alert(msg);
}

/* file handler */
function loadFile(path, callback /* function(contents) */) {
  $.get(path, null, callback, 'text')
    .error(function() { error() });
}

/* lib handler */
var scene = null;
var object = null;
var internalObject = null;

function openGCodeFromPath(path) {
  if (object) {
    scene.remove(object);
  }
  loadFile(path, function(gcode) {
    object = createObjectFromGCode(gcode);
    scene.add(object);
    localStorage.setItem('last-loaded', path);
    localStorage.removeItem('last-imported');
  });
}

function openGCodeFromText(gcode) {
  if (object) {
    scene.remove(object);
  }
  object = createObjectFromGCode(gcode);
  scene.add(object);
  localStorage.setItem('last-imported', gcode);
  localStorage.removeItem('last-loaded');
	gcode_a = gcodeToArray(gcode);
	bbox = gcodeBoundingBox(gcode_a);
	param_slider['x'].slider('option','value',bbox.x+bbox.w/2);
	param_slider['x'].slider('option','max',bbox.x+bbox.w);
	param_slider['x'].slider('option','min',bbox.x);
	changeParams(null, bbox.x + bbox.w/2, 'x');

	param_slider['y'].slider('option','value',bbox.y+bbox.d/2);
	param_slider['y'].slider('option','max',bbox.y+bbox.d);
	param_slider['y'].slider('option','min',bbox.y);
	changeParams(null, bbox.y + bbox.d/2, 'y');
	
	if (internalObject) {
		createThreeInsertObject();
	}
}

function createThreeInsertObject() {
	if (internalObject) {
		scene.remove(internalObject);
	}
	var param_x = Number($('#tag_x').slider('option', 'value'));
	var param_y = Number($('#tag_y').slider('option', 'value'));
	var param_z = Number($('#tag_z').slider('option', 'value'));
	var param_h = Number($('#tag_height').slider('option', 'value')) || 4.0;
	var param_r = Number($('#tag_radius').slider('option', 'value')) || 5.0;
	internalObject = generateThreeInsert(param_h, param_x, param_y, param_z, "TAG", param_r);
	scene.add(internalObject);
}

function extractTag() {
	var param_x = Number($('#tag_x').slider('option', 'value'));
	var param_y = Number($('#tag_y').slider('option', 'value'));
	var param_z = Number($('#tag_z').slider('option', 'value'));
	var param_h = Number($('#tag_height').slider('option', 'value')) || 4.0;
	var param_r = Number($('#tag_radius').slider('option', 'value')) || 5.0;
	var res = 16;
	tag = generateInsert(param_h, res, param_x, param_y, param_z, "TAG", param_r);

	var gcode_a = gcodeToArray(localStorage.getItem('last-imported'));
	var mid_gcode = gcodeIntersect(gcode_a, tag.dimension, tag.shape);
	var out_gcode = convertGcode(mid_gcode);
	var output = "";
	for(i=0; i<out_gcode.length; i++) {
		for(j=0; j<out_gcode[i].length; j++) {
			output += out_gcode[i][j] + " ";
		}
		output += "\n";
	}
	if (object) {
		scene.remove(object);
	}
	object = createObjectFromGCode(output);
	scene.add(object);
	localStorage.setItem('last-imported', output);
	localStorage.removeItem('last-loaded');
	tag = '';
}

/* upload handler */
var progress, stat, reader;

function handleUpload(event) {
	var files = event.originalEvent.dataTransfer.files;
	if (files.length > 0) {

		// Reset progress indicator on new file selection.
		progress.css('width','0%');
		progress.text('0%');

		reader = new FileReader();
		reader.onerror = errorHandler;
		reader.onprogress = updateProgress;
		reader.onabort = function(e) {
			$('#upload_status').text('UPLOAD CANCELLED');
			files.value = '';
		};
		reader.onloadstart = function(e) {
			$('#progress_bar').addClass('loading');
			$('#cancel_upload').show();
			$('#upload_status').text('UPLOADING');
		};
		reader.onload = function(e) {
			// Ensure that the progress bar displays 100% at the end.
			progress.css('width','100%');
			progress.text('100%');
			openGCodeFromText(reader.result);
			$('#upload_status').text('PARSING');
			$('#cancel_upload').hide();
		};
		reader.onloadend = function(e) {
			$('#upload_status').text('DONE');
		};
		reader.readAsText(files[0]);
	}
}

function abortRead() {
	reader.abort();
}

function errorHandler(event) {
	switch(event.target.error.code) {
		case event.target.error.NOT_FOUND_ERR:
			$('#upload_status').text('ERROR : \nFile not found');
			break;
		case event.target.error.NOT_READABLE_ERR:
			$('#upload_status').text('ERROR : \nFile is not readable');
			break;
		case event.target.error.ABORT_ERR:
			break; // noop
		default:
			$('#upload_status').text('ERROR : \nUpload error');
	};
	$('#cancel_upload').hide();
}

function updateProgress(event) {
	if (event.lengthComputable) {
		var percentLoaded = Math.round((event.loaded / event.total) * 100);
		// Increase the progress bar length.
		if (percentLoaded < 100) {
			progress.css('width',percentLoaded + '%');
			progress.text(percentLoaded + '%');
		}
	}
}

/* view handler */
var param_slider = {x:null, y:null, z:null, height:null, radius:null}

function changeParams(event, value, param) {
	$(".form-group label[for='tag_" + param + "']").text("Tag " + param + " : " + value);
	if (internalObject) {
		createThreeInsertObject();
	}
}

$(function() {
  if (!Modernizr.webgl) {
    alert('Sorry, you need a WebGL capable browser to use this.\n\nGet the latest Chrome or FireFox.');
    return;
  }

  if (!Modernizr.localstorage) {
    alert("Man, your browser is ancient. I can't work with this. Please upgrade.");
    return;
  }

	// Drop files from desktop onto main page to import them.
	$(window).on('dragleave', function(event) {
	 	$('#upload_area').hide();
	});
	$(window).on('dragover', function(event) {
		event.stopPropagation();
		event.preventDefault();
		event.originalEvent.dataTransfer.dropEffect = 'copy'
		$('#fileModal').modal('show');
		$('#upload_area').show();
	});
	$('#upload_area').on('drop', function(event) {
		event.stopPropagation();
		event.preventDefault();
		$('#upload_progress').show();
		$('#upload_area').hide();
		handleUpload(event);
	});
  
	// assigning DOM to vars
	progress = $('#percent');
	stat = $('#file_status');

	// binding actions
	// $('#open_dialog').on('click', openDialog);
	// $('#open_tag_dialog').on('click', openTagDialog);
	$('#cancel_upload').on('click', abortRead);
	$('#download_data').on('click', function() {
		this.href = '';
		var gcode = localStorage.getItem('last-imported');
		this.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(gcode);
	});
	$('#preview_insert').on('click', createThreeInsertObject);
	$('#execute_insert').on('click', extractTag);
	$('#fileModal').on('hidden', function() {
		$('#upload_progress').hide();
	});

	param_slider.x = $('#tag_x').slider({
		min: 0, value: 25, max: 50,
		create: function(event, ui){ 
			changeParams(event, 25, 'x'); 
		},
		slide: function(event, ui){ 
			changeParams(event, ui.value, 'x'); 
		}
	});
	param_slider.y = $('#tag_y').slider({
		min: 0, value: 25, max: 50,
		create: function(event, ui){ 
			changeParams(event, 25, 'y'); 
		},
		slide: function(event, ui){ 
			changeParams(event, ui.value, 'y'); 
		}
	});
	param_slider.z = $('#tag_z').slider({
		min: 0, value: 5.0, max: 10.0,
		create: function(event, ui){
			changeParams(event, 5.0, 'z'); 
		},
		slide: function(event, ui){ 
			changeParams(event, ui.value, 'z'); 
		}
	});
	param_slider.height = $('#tag_height').slider({
		min: 0, value: 4.0, max: 10,
		create: function(event, ui){ 
			changeParams(event, 4.0, 'height'); 
		},
		slide: function(event, ui){ 
			changeParams(event, ui.value, 'height'); 
		}
	});
	param_slider.radius = $('#tag_radius').slider({
		min: 0, value: 5.0, max: 10,
		create: function(event, ui){ 
			changeParams(event, 5.0, 'radius'); 
		},
		slide: function(event, ui){ 
			changeParams(event, ui.value, 'radius'); 
		}
	});

	scene = createScene($('#renderArea'));
	var lastImported = localStorage.getItem('last-imported');
	var lastLoaded = localStorage.getItem('last-loaded');
	if (lastImported) {
	  openGCodeFromText(lastImported);
	} else {
	  openGCodeFromPath(lastLoaded || 'examples/octocat.gcode');
	}
});

