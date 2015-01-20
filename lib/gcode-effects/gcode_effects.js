"use strict";

var AXIS_DIGIT = 3;
var FREQ_DIGIT = 3;
var EXT_DIGIT = 5;
var RETRACT_FREQUENCY = 6000.000;
var TAG_CMD = null;

var Dimension = function Dimension(max_x = 0, min_x = 0, max_y = 0, min_y = 0, max_z = 0, min_z = 0) {
	this.w = Math.abs(max_x - min_x);
	this.d = Math.abs(max_y - min_y);
	this.h = Math.abs(max_z - min_z);
	this.x = min_x;
	this.y = min_y;
	this.z = min_z;
};

var Point = function Point(x, y, z = 0) {
	this.x = x;
	this.y = y;
	this.z = z;
	// this.line_number = c;
};

function generateInsert(height = 4.0, resolution = 16, _x, _y, _z, type = "TAG", param = 5.0) {
	var shape;
	if (type == "TAG") {
		var base_point = new Point(_x, _y, _z);
		shape = createTag(param, base_point, resolution);
	}
	var dimension = shapeBoundingBox(shape, _z, height);
	return {dimension:dimension, shape:shape};
}

function createTag(radius, base, resolution) {
	var tag_s = new Array();
	var center_x = radius + base.x, center_y = radius + base.y;
	var i, t;
	var a, b;
	a = new Point(center_x + radius, center_y);
	for(i=0; i<resolution; i++) {
		b = new Point(center_x + radius * Math.cos((i+1)*2*Math.PI/resolution), center_y + radius * Math.sin((i+1)*2*Math.PI/resolution));
		t = new Array();
		t.push(a);
		t.push(b);
		tag_s.push(t);
		a = new Point(b.x, b.y);
	}
	return tag_s;
}

var internalColor = 0x0000FF;

function generateThreeInsert(height = 4.0, _x, _y, _z, type = "TAG", param = 5.0) {
	var object;
	if (type == "TAG") {
		object = createThreeTag(_x, _y, _z, param, height);
	}
	return object;
}

/* need three.js loaded */
function createThreeTag(_x, _y, _z, _r, _h) {
	var object = new THREE.Object3D();
	var geometry = new THREE.Geometry();
   var color = new THREE.Color(internalColor);
	var res = 100;
	var res_h = 50;
	var res_v = 2 * res;
	var center_x = _x + _r;
	var center_y = _y + _r;
	for(var i=0; i<res_v/2; i++) {
		geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((i)*2*Math.PI/res_v), center_y + _r * Math.sin((i)*2*Math.PI/res_v), _z));
		geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((res_v-1-i)*2*Math.PI/res_v), center_y + _r * Math.sin((res_v-1-i)*2*Math.PI/res_v), _z+_h));
		geometry.colors.push(color);
		geometry.colors.push(color);
	}
	for(var j=_z;j<(_z+_h);j+=(_h/res_h)) {
		for(var i=0; i<res; i++) {
			geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((i)*2*Math.PI/res), center_y + _r * Math.sin((i)*2*Math.PI/res), j));
			if (i == res-1) {
				geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((i)*2*Math.PI/res), center_y + _r * Math.sin((0)*2*Math.PI/res), j));
			} else {
				geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((i+1)*2*Math.PI/res), center_y + _r * Math.sin((i+1)*2*Math.PI/res), j));
			}
			geometry.colors.push(color);
			geometry.colors.push(color);
		}
	}
	for(var i=0; i<res_v/2; i++) {
		geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((i)*2*Math.PI/res_v), center_y + _r * Math.sin((i)*2*Math.PI/res_v), _z+_h));
		geometry.vertices.push(new THREE.Vector3(center_x + _r * Math.cos((res_v-1-i)*2*Math.PI/res_v), center_y + _r * Math.sin((res_v-1-i)*2*Math.PI/res_v), _z+_h));
		geometry.colors.push(color);
		geometry.colors.push(color);
	}
	var lineMaterial = new THREE.LineBasicMaterial({
		opacity:0.9,
		transparent:true,
		linewidth: 1,
		vertexColors: THREE.FaceColors
		});
	object.add(new THREE.Line(geometry, lineMaterial, THREE.LinePieces));
	var scale = 3;
	object.scale.multiplyScalar(scale);
	return object;
}

function gcodeToArray(gcode) {
	// remove comment line
	var re = /^\;.*$/mgi;
	gcode = gcode.replace(re, " ");

	// split whole chunk of code into array
	var g_c = gcode.split("\n");

	var g_out = new Array();
	var i,h,g,j;
	for (i=0, h=0; i<g_c.length; i++) {
		// erase white spaces on heads and tails
		g = $.trim(g_c[i]);
		if (g != "") {
			// break in to array if not empty
			var t = g.split(" ");
			g_out[h] = new Array();

			// check for comments
			for (j=0; j<t.length; j++) {
				// remove comments;
				if (t[j] == ";") {
					break;
				} else if(t[j].charAt(0).toUpperCase() != "N") {
					g_out[h].push(t[j].toUpperCase());
				}
			}
			h++;
		}
	}

	// empty g_c for memory
	g_c = "";
	return g_out;
}

// getting dimetion object from geometry object
function shapeBoundingBox(geometry, geom_z, height) {
	var max_x, min_x, max_y, min_y;

	var i,j;
	if (geometry.length == 0) {
		return false;
	} else {
		max_x = geometry[0][0].x, min_x = geometry[0][0].x;
		max_y = geometry[0][0].y, min_y = geometry[0][0].y;

		for (i=0; i<geometry.length; i++) {
			for (j=0; j<geometry[i].length; j++) {
				if (max_x < geometry[i][j].x) {
					max_x = geometry[i][j].x;
				} else if (min_x > geometry[i][j].x) {
					min_x = geometry[i][j].x;
				}
				if (max_y < geometry[i][j].y) {
					max_y = geometry[i][j].y;
				} else if (min_y > geometry[i][j].y) {
					min_y = geometry[i][j].y;
				}
			}
		}

		var d = new Dimension(max_x, min_x, max_y, min_y, geom_z + height, geom_z);
		return d;
	}
}

// getting dimension object from gcode
function gcodeBoundingBox(gcode) {
	var max_x, min_x, max_y, min_y, max_z, min_z;
	var _trig_x = false, _trig_y = false, _trig_z = false;

	var i,j,num;
	for (i=0; i<gcode.length; i++) {
		for (j=0; j<gcode[i].length; j++) {
			switch(gcode[i][j].charAt(0)) {
				case "X":
					num = Number(gcode[i][j].slice(1));
					if (!_trig_x) {
						max_x = num, min_x = num, _trig_x = true;
					} else {
						if (max_x < num) {
							max_x = num;
						} else if (min_x > num) {
							min_x = num;
						}
					}
					break;
				case "Y":
					num = Number(gcode[i][j].slice(1));
					if (!_trig_y) {
						max_y = num, min_y = num, _trig_y = true;
					} else {
						if (max_y < num) {
							max_y = num;
						} else if (min_y > num) {
							min_y = num;
						}
					}
					break;
				case "Z":
					num = Number(gcode[i][j].slice(1));
					if (!_trig_z) {
						max_z = num, min_z = num, _trig_z = true;
					} else { 
						if (max_z < num) {
							max_z = num;
						} else if (min_z > num) {
							min_z = num;
						}
					}
					break;
				case "G":
					if (gcode[i][j] == "G28") {
						if (!_trig_x) {
							max_x = 0, min_x = 0, _trig_x = true;
						} else if (max_x < 0) {
							max_x = 0;
						} else if (min_x > 0) {
							min_x = 0;
						}
						if (!_trig_y) {
							max_y = 0, min_y = 0, _trig_y = true;
						} else if (max_y < 0) {
							max_y = 0;
						} else if (min_y > 0) {
							min_y = 0;
						}
						if (!_trig_z) {
							max_z = 0, min_z = 0, _trig_z = true;
						} else if (max_z < 0) {
							max_z = 0;
						} else if (min_z > 0) {
							min_z = 0;
						}
					}
					break;
				default:
					break;
			}
		}
	}
	if (!_trig_x || !_trig_y || !_trig_z) {
		return false;
	} else {
		var d = new Dimension(max_x, min_x, max_y, min_y, max_z, min_z);
		return d;		
	}
}

function gcodeIntersect(t_gcode, r_dim, r_geometry) {
	// what will you do if the point was inside the region from the first moment?
	var i = 0, j=0;

	var first_x, first_y, first_z;
	while(first_x == null || first_y == null || first_z == null) {
		for (j=0; j<t_gcode[i].length; j++) {
			switch(t_gcode[i][j].charAt(0)) {
				case "X":
					first_x = Number(t_gcode[i][j].slice(1));
					break;
				case "Y":
					first_y = Number(t_gcode[i][j].slice(1));
					break;
				case "Z":
					first_z = Number(t_gcode[i][j].slice(1));
					break;
				case "G":
					if (t_gcode[i][j] == "G28") {
						first_x = 0, first_y = 0, first_z = 0;
					}
					break;
				default:
					break;
			}
		}
		i++;
	}

	var _inRegionTemp = false, _onRegionTemp = false;

	var a_point = new Point(first_x, first_y, first_z);
	var b_point = new Point(first_x, first_y, first_z);
	var o_point = new Point(r_dim.x - 10, r_dim.y - 10, first_z);

	for (; i<t_gcode.length; i++) {
		switch(t_gcode[i][0]) {
			case "G28":
				// b_point.x = 0, b_point.y = 0, b_point.z = 0;
				b_point = new Point(0, 0, 0);
				break;
			case "G0":
			case "G1":
				for (j=0; j<t_gcode[i].length; j++) {
					switch(t_gcode[i][j].charAt(0)) {
						case "X":
							// b_point.x = Number(t_gcode[i][j].slice(1));
							b_point = new Point(Number(t_gcode[i][j].slice(1)), b_point.y, b_point.z);
							break;
						case "Y":
							// b_point.y = Number(t_gcode[i][j].slice(1));
							b_point = new Point(b_point.x, Number(t_gcode[i][j].slice(1)), b_point.z);
							break;
						case "Z":
							// b_point.z = Number(t_gcode[i][j].slice(1));
							b_point = new Point(b_point.x, b_point.y, Number(t_gcode[i][j].slice(1)));
							break;
						default:
							break;
					}
				}
				break;
			default:
				break;
		}

		if (a_point.x != b_point.x || a_point.y != b_point.y || a_point.z != b_point.z) {
			// the point has moved from the former one, so we will check whether the z height is inside the region
			if ((a_point.z >= r_dim.z && a_point.z <= r_dim.z + r_dim.h) || (b_point.z >= r_dim.z && b_point.z <= r_dim.z + r_dim.h)) {
				// detection within the same layer
				// if (a_point.z == b_point.z) {
					var intersection;
					var interPoints = new Array();

					for (j=0; j<r_geometry.length; j++) {
						intersection = intersect(r_geometry[j][0], r_geometry[j][1], a_point, b_point);
						if (intersection != false) {
							var tmp_point = new Point(intersection.x, intersection.y, b_point.z);
							interPoints.push(tmp_point);
						}
					}

					// sort intersection points and line them in order from a_point to b_point like a gradation
					if (interPoints.length > 0) {
						interPoints = sortAndCullDup(interPoints, a_point, b_point);
					}

					// check whether the line segment is inside the region or not
					var _onRegion = onRegion(r_geometry, b_point);
					var _inRegion = inRegion(r_geometry, b_point, o_point);
					var _halfInRegion;

					if (_onRegionTemp) {
						var m_point = new Point((a_point.x + b_point.x) / 2, (a_point.y + b_point.y) / 2, (a_point.z + b_point.z) / 2);
						_halfInRegion = inRegion(r_geometry, m_point, o_point);
					}

					if (interPoints.length > 0) {
						interPoints.unshift(a_point);
						interPoints.push(b_point);
						// has more than one intersection. therefore, in any case, there will be a culling of the line
						if ((_onRegionTemp && _halfInRegion) || _inRegionTemp) {
							t_gcode[i].unshift(interPoints);
							t_gcode[i].unshift("ODD");
						} else {
							t_gcode[i].unshift(interPoints);
							t_gcode[i].unshift("EVEN");
						}
					} else if (interPoints.length == 0) {
						// maybe moving inside the region
						if ((_inRegionTemp && _inRegion) || (_inRegionTemp && _onRegion) || (_onRegionTemp && _onRegion)) {
							t_gcode[i].unshift("CULL");
						} else if (_onRegionTemp && _onRegion && _halfInRegion) {
							t_gcode[i].unshift("CULL");
						}
					}

					_onRegionTemp = false, _inRegionTemp = false;
					if (_onRegion) {
						_onRegionTemp = true;
					} else if (_inRegion) {
						_inRegionTemp = true;
					}
				// } else {
				// // under progress
				// // have to consider how to deal with the line
				// }
			}
			// set Point a, exactly to the coordinate of b
			a_point = new Point(b_point.x, b_point.y, b_point.z);
			// a_point.x = b_point.x, a_point.y = b_point.y, a_point.z = b_point.z;
		}
	}

	return t_gcode;
}

function extrusionSliceLength(t, e) {
	var i;
	var result = new Array;

	var start_point = t[0];
	var end_point = t[t.length-1];
	if (start_point.x != end_point.x) {
		var base = Math.abs(start_point.x - end_point.x);
		var a,b;
		for (i=1; i<t.length; i++) {
			a = t[i-1].x;
			b = t[i].x;
			result.push(e*Math.abs(Math.abs(a - b)/base));
		}
	}
	else if (start_point.y != end_point.y) {
		var base = Math.abs(start_point.y - end_point.y);
		var a,b;
		for (i=1; i<t.length; i++) {
			a = t[i-1].y;
			b = t[i].y;
			result.push(e*Math.abs(Math.abs(a - b)/base));
		}
	}
	else if (start_point.z != end_point.z) {
		var base = Math.abs(start_point.z - end_point.z);
		var a,b;
		for (i=1; i<t.length; i++) {
			a = t[i-1].z;
			b = t[i].z;
			result.push(e*Math.abs(Math.abs(a - b)/base));
		}
	}

	return result;
}

function convertGcode(t_gcode, retract = 1) {
	var r_gcode = new Array();
	var original_e = 0, current_e = 0;
	var _retracting = false;

	var i,j;
	var last_z;

	for (i=t_gcode.length-1; i>=0; i--) {
		var code = t_gcode[i][0];
		if (code == "G0" || code == "G1") {
			for (j=1; j<t_gcode[i].length; j++) {
				if (t_gcode[i][j].charAt(0) == "Z") {
					last_z = i;
				}
			}
		} else if (code == "ODD" || code == "EVEN" || code == "CULL") {
			last_z++;
			if (TAG_CMD) {
				// cmd insert action
				// t_gcode.splice(last_z, 0, [';', 'DROP TAG HERE']);
			} else {
				t_gcode.splice(last_z, 0, [';', 'DROP TAG HERE']);
			}
			break;
		}
	}
	for (i=0; i<t_gcode.length; i++) {
		var t = new Array();
		var e;
		var command;
		var code = t_gcode[i][0];
		if (code == "ODD" || code == "EVEN") {
			// avoid inserting the first element
			for (j=1; j<t_gcode[i].length; j++) {
				if (t_gcode[i][j] instanceof Array) {
					t = t_gcode[i][j];
				} else if (t_gcode[i][j].charAt(0) == "E") {
					// insert the extrusion length to the two variables
					e = Number(t_gcode[i][j].slice(1));
				} else if (t_gcode[i][j].charAt(0) == "M" || t_gcode[i][j].charAt(0) == "G") {
					command = t_gcode[i][j];
				}					
			}
			
			var slice_filament = extrusionSliceLength(t, e-original_e);
			r_gcode.push(["; script working from here"]);
			for (j=0; j<slice_filament.length; j++) {
				if ((code == "ODD" && j%2 == 0) || (code == "EVEN" && j%2 == 1)) {
					if (!_retracting) {
						current_e = Number(current_e - retract);
						_retracting = true;
					}
				} else {
					if (_retracting) {
						current_e = Number(current_e + retract);
						r_gcode.push(["G1", "E"+current_e.toFixed(EXT_DIGIT), "F"+RETRACT_FREQUENCY.toFixed(FREQ_DIGIT)]);
						_retracting = false;
					}
					current_e += Number(slice_filament[j]);
				}
				r_gcode.push([command, "X" + t[j+1].x.toFixed(AXIS_DIGIT), "Y" + t[j+1].y.toFixed(AXIS_DIGIT), "Z" + t[j+1].z.toFixed(AXIS_DIGIT), "E" + current_e.toFixed(EXT_DIGIT)]);
			}
			r_gcode.push(["; until here"]);
			original_e = e;
		} else if (code == "G0" || code == "G1") {
			// subtract the length of extrusion from gcode_e
			// add them to current_e
			if (_retracting) {
				current_e = Number(current_e + retract);
				r_gcode.push(["G1", "E"+current_e.toFixed(EXT_DIGIT), "F"+RETRACT_FREQUENCY.toFixed(FREQ_DIGIT)]);
				_retracting = false;
			}
			var tmp_code = t_gcode[i];
			for (j=1; j<tmp_code.length; j++) {
				if (tmp_code[j].charAt(0) == "E") {
					e = Number(tmp_code[j].slice(1));
					current_e = Number(current_e + e - original_e);
					original_e = e;
					tmp_code[j] = "E" + current_e.toFixed(EXT_DIGIT);
				}
			}
			r_gcode.push(tmp_code);
		} else if (code == "G92") {
			// under progress
			// need to reset the removed length of filament to zero
			// some kind of offset system is needed
			for (j=1; j<t_gcode[i].length; j++) {
				if (t_gcode[i][j].charAt(0) == "E") {
					e = Number(t_gcode[i][j].slice(1));
					current_e = e;
					original_e = e;
				}
			}
			r_gcode.push(t_gcode[i]);
		} else if (code == "CULL") {
			var tmp_code = t_gcode[i];
			if (!_retracting) {
				current_e = Number(current_e - retract);
				_retracting = true;
			}
			for (j=1; j<tmp_code.length; j++) {
				if (tmp_code[j].charAt(0) == "E") {
					e = Number(tmp_code[j].slice(1));
					original_e = e;
					tmp_code[j] = "E" + current_e.toFixed(EXT_DIGIT);
				}
			}
			tmp_code.shift();
			r_gcode.push(tmp_code);
		} else {
			r_gcode.push(t_gcode[i]);
		}
	}

	return r_gcode;
}

// check whether the point is inside the region or not
// cannot identify whether the object is online or not
function inRegion(r_geometry, point, o_point) {
	var j;
	var intersection = false;

	// // checking the z height
	// for (j=0; j<r_geometry.length; j++) {
	// 	if (r_geometry[j][0].z <= point.z || r_geometry[j][0].z + r_geometry[j][0] >= point.z || 
	// 		r_geometry[j][1].z <= point.z || r_geometry[j][1].z + r_geometry[j][1] >= point.z) {
	// 		intersection = true;
	// 	}
	// }

	// checking the intersection between each line segment of the r_geometry and the two points
	if (intersection) {
		var interPoints = 0;
		for (j=0; j<r_geometry.length; j++) {
			intersection = intersect(r_geometry[j][0], r_geometry[j][1], point, o_point);
			if (intersection != false) {
				interPoints.push(intersection);
			}
		}
		interPoints = sortAndCullDup(interPoints);

		if (interPoints.length%2 == 0) {
			return false;
		} else {
			return true;
		}
	}
}

function sortAndCullDup(interPoints, start_point, end_point) {
	var x_rev = false, y_rev = false, z_rev = false;
	if (start_point.x > end_point.x) {
		x_rev = true;
	}
	if (start_point.y > end_point.y) {
		y_rev = true;
	}
	if (start_point.z > end_point.z) {
		z_rev = true;
	}

	interPoints.sort(function(a, b){
		if (a.x != b.x) {
			if (!x_rev) {
				return a.x - b.x;
			} else {
				return b.x - a.x;
			}
		} else if (a.y != b.y) {
			if (!y_rev) {
				return a.y - b.y;
			} else {
				return b.y - a.y;
			}
		} else {
			if (!z_rev) {
				return a.z - b.z;
			} else {
				return b.z - a.z;
			}
		}
	});

	var t = new Array();
	var a, b;
	a = new Point(interPoints[0].x, interPoints[0].y, interPoints[0].z);
	t.push(a);

	for (var j=1; j<interPoints.length; j++) {
		a = new Point(interPoints[j-1].x, interPoints[j-1].y, interPoints[j-1].z);
		b = new Point(interPoints[j].x, interPoints[j].y, interPoints[j].z);
		if (a.x != b.x || a.y != b.y || a.z != b.z) {
			t.push(b);
		}
	}

	return t;
}

// check the possibility of crossing the region
// broad detection of whether the line is crossing or inside the region or not
// not perfectly accurate
function cross(a_point, b_point, dim) {
	// z axis out of parameter
	if ((a_point.z <= dim.z && b_point.z <= dim.z) || (a_point.z >= (dim.h + dim.z) && b_point.z >= (dim.h + dim.z))) {
		return false;
	// x axis out of parameter
	} else if ((a_point.x <= dim.x && b_point.x <= dim.x) || (a_point.x >= (dim.w + dim.x) && b_point.x >= (dim.w + dim.x))) {
		return false;
	// y axis out of parameter
	} else if ((a_point.y <= dim.y && b_point.y <= dim.y) || (a_point.y >= (dim.d + dim.y) && b_point.y >= (dim.d + dim.y))) {
		return false;
	} else {
		return true;
	}
}

function onRegion(r_geometry, b) {
	var i;
	var as_b,ae_b,as_ae;
	for (i=0; i<r_geometry.length; i++) {
		as_b = Math.sqrt(Math.pow((r_geometry[i][0].x - b.x), 2) + Math.pow((r_geometry[i][0].y - b.y), 2) + Math.pow((r_geometry[i][0].z - b.z), 2));
		ae_b = Math.sqrt(Math.pow((r_geometry[i][1].x - b.x), 2) + Math.pow((r_geometry[i][1].y - b.y), 2) + Math.pow((r_geometry[i][1].z - b.z), 2));
		as_ae = Math.sqrt(
			Math.pow((r_geometry[i][0].x - r_geometry[i][1].x), 2) 
			+ Math.pow((r_geometry[i][0].y - r_geometry[i][1].y), 2) 
			+ Math.pow((r_geometry[i][0].z - r_geometry[i][1].z), 2)
			);
		if (as_ae >= as_b + ae_b) {
			return true;
		}
	}
	return false;
}

function intersect(a_s, a_e, b_s, b_e) {
	if (interBool(a_s, a_e, b_s, b_e)) {
		var p = interPt(a_s, a_e, b_s, b_e);
		return p;
	} else {
		// the line is going through the tip of the vertices
		if (onRegion(b_s, b_e, a_s)) {
			return a_s;
		} else if (onRegion(b_s, b_e, a_e)) {
			return a_e;
		} else {
			return false;
		}
	}
}

function interBool(a_s, a_e, b_s, b_e) {
 	if (((a_s.x - a_e.x) * (b_s.y - a_s.y) + (a_s.y - a_e.y) * (a_s.x - b_s.x)) * ((a_s.x - a_e.x) * (b_e.y - a_s.y) + (a_s.y - a_e.y) * (a_s.x - b_e.x)) < 0) {
 		if (((b_s.x - b_e.x) * (a_s.y - b_s.y) + (b_s.y - b_e.y) * (b_s.x - a_s.x)) * ((b_s.x - b_e.x) * (a_e.y - b_s.y) + (b_s.y - b_e.y) * (b_s.x - a_e.x)) < 0) {
			return true;
		}
	}
	// check if there aren't any points on the line
	return false;
}

function interPt(a_s, a_e, b_s, b_e) {
	var r = ((b_e.y - b_s.y) * (b_s.x - a_s.x) - (b_e.x - b_s.x) * (b_s.y - a_s.y)) / ((a_e.x - a_s.x) * (b_e.y - b_s.y) - (a_e.y - a_s.y) * (b_e.x - b_s.x));
	var p = new Point(a_s.x + r * (a_e.x - a_s.x), a_s.y + r * (a_e.y - a_s.y));
	return p;
}

