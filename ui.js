/* general use */
function error(msg) {
  alert(msg);
}

/* file handler */
function loadFile(path, callback /* function(contents) */) {
  $.get(path, null, callback, 'text')
    .error(function() { error() });
}

function openDialog(event) {
	if (event) {
		event.preventDefault();
	}
  $('#openModal').modal();
}

/* viewer handler */
function openTagDialog(event) {
	event.preventDefault();
  $('#tagModal').modal();
}

/* lib handler */
var scene = null;
var object = null;

function openGCodeFromPath(path) {
  //$('#openModal').modal('hide');
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
  //$('#openModal').modal('hide');
  if (object) {
    scene.remove(object);
  }
  object = createObjectFromGCode(gcode);
  scene.add(object);
  localStorage.setItem('last-imported', gcode);
  localStorage.removeItem('last-loaded');
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

$(function() {
  if (!Modernizr.webgl) {
    alert('Sorry, you need a WebGL capable browser to use this.\n\nGet the latest Chrome or FireFox.');
    return;
  }

  if (!Modernizr.localstorage) {
    alert("Man, your browser is ancient. I can't work with this. Please upgrade.");
    return;
  }

  // Show 'About' dialog for first time visits.
//  if (!localStorage.getItem("not-first-visit")) {
//    localStorage.setItem("not-first-visit", true);
//    setTimeout(about, 500);
//  }

  // Drop files from desktop onto main page to import them.
  $(window).on('dragleave', function(event) {
		$('#upload_area').hide();
  })
  $(window).on('dragover', function(event) {
    event.stopPropagation();
    event.preventDefault();
    event.originalEvent.dataTransfer.dropEffect = 'copy'
		openDialog();
		$('#upload_area').show();
  })
  $('#upload_area').on('drop', function(event) {
    event.stopPropagation();
    event.preventDefault();
	 $('#upload_progress').show();
	 handleUpload(event);
		$('#upload_area').hide();
  });
  
	// assigning DOM to vars
	progress = $('#percent');
	stat = $('#file_status');

	// binding actions
	$('#open_dialog').on('click', openDialog);
	$('#open_tag_dialog').on('click', openTagDialog);
	$('#cancel_upload').on('click', abortRead);
	$('.modal').on('hidden', function() {
		$('#progress_bar').removeClass('loading');
		$('#upload_progress').hide();
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

