const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var MotionControlPort;
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
let navigation;
let fonts;
let jetcad = new JetCad();

const Workbench = "ImageScan";
var CurrentFile = null;

function CreateMenu()
{
	const {remote} = require('electron');
  const {Menu, MenuItem} = remote;

  const menu = new Menu();
  menu.append(new MenuItem ({
    label: 'File',
		submenu: [
			{ label: 'Open',
			click: function() {
				OpenImage();
			}},
			{ label: 'Export',
			click: function() {
				Export();
			}},
			{ label: 'Debug',
			click: function() {
				require('electron').remote.getCurrentWindow().toggleDevTools();
			}},
			{ label: 'Reload',
			click: function() {
				require('electron').remote.getCurrentWindow().reload();
			}}
		]
 }));
 appendWorkbenchMenu(menu);
	Menu.setApplicationMenu(menu);
}
function SaveDrawingAs()
{
	const {dialog} = electron.remote;
	dialog.showSaveDialog({
		filters: [
						{ name: 'DXF', extensions: ['dxf'] },
						{ name: 'SVG', extensions: ['svg'] },
					]
		}, function (file) {
				if (file !== undefined)
				{
					if (file.includes(".dxf"))
					{
						console.log("Save dxf file: " + file);
						fs.writeFile(file, jetcad.ExportDXF(),
					    // callback function that is called after writing file is done
					    function(err) {
					        if (err) throw err;
					        // if no error
					        //console.log("Data is written to file successfully.")
						});
					}
					if (file.includes(".svg"))
					{
						console.log("Save svg file: " + file);
						fs.writeFile(file, jetcad.ExportSVG(),
					    // callback function that is called after writing file is done
					    function(err) {
					        if (err) throw err;
					        // if no error
					        //console.log("Data is written to file successfully.")
						});
					}
				}
		});
}
function main()
{
	CreateMenu();
	var displayImg = function (){
    var imgdiv = document.getElementById('imgdiv');
    imgdiv.style.display = 'inline-block';
    imgdiv.innerHTML = "<p>Input image:</p>";
    imgdiv.appendChild(Potrace.img);
  };

  var displaySVG = function(size, type){
    var svgdiv = document.getElementById('svgdiv');
    svgdiv.style.display = 'inline-block';
    svgdiv.innerHTML = Potrace.getSVG(size, type);
  };

  var handleFiles = function(files) {
    var threshHold = document.getElementById("thresh-hold");

    Potrace.loadImageFromFile(files[0]);
    Potrace.process(function(){
      //displayImg();
      var scaleFactor = document.getElementById("scale-factor");
      var size = Number(scaleFactor.value);
      //console.log(size);
      displaySVG(size);
    });
  };
	//$("#Content").html("<div id='markdown' style='margin: auto; width: 80%; height: 80%; margin-top: 10px;'></div>");
	//$("#markdown").html("<iframe frameborder='0' src='https://jetcad.io/docs/?vectorize_mode' style='overflow:hidden;height:" + ($(window).height() - 150) + "px;width: 100%'></iframe>");
  var markup = "";
  markup += '<input id="trace-image" name="myFile" type="file"><br>';
  markup += 'Scale Factor: <input type="range" id="scale-factor" min="0.1" value="0.5" max="2" step="0.1" style="width: 200px;"><br>';
  //markup += 'Thresh Hold: <input type="range" id="thresh-hold" min="1" value="125" max="255" step="1" style="width: 200px;"><br>';
  markup += '<input type="button" id="create-drawing" value="Save as DXF" style="width: 200px;"><br>';
  //markup += '<div style="height: 300px;" id="imgdiv"></div><br>';
  markup += '<div id="svgdiv"></div><br>';
  $("#Content").html(markup);

  var imageInput = document.getElementById("trace-image");
  var scaleFactor = document.getElementById("scale-factor");
  //var threshHold = document.getElementById("thresh-hold");

  var createDrawing = document.getElementById("create-drawing");

  createDrawing.addEventListener("click", function (e) {
    console.log("Create drawing!");

    var path = document.getElementById('svg').firstChild;
    var data = path.getAttribute('d');
    var model_stack = jetcad.MakerJS.importer.fromSVGPathData(data);
    console.log(model_stack);

		jetcad.Stack = [];
		jetcad.init();
    //First import lines
    for (var line_paths in model_stack.paths)
		{
      var path_object = model_stack.paths[line_paths];
			jetcad.Stack.push(path_object);
		}
    //Import arc that are converted from Bezier lines
    for (var arc_paths in model_stack.models)
		{
      var model_object = model_stack.models[arc_paths];
      for (var arc in model_object.paths)
      {
        var arc_object = model_object.paths[arc];
        jetcad.Stack.push(arc_object);
      }
		}
		SaveDrawingAs();
  }, false);


  /*threshHold.addEventListener("change", function (e) {
    var imageInput = document.getElementById("trace-image");
    handleFiles(imageInput.files);
  }, false);*/

  scaleFactor.addEventListener("change", function (e) {
    var imageInput = document.getElementById("trace-image");
    handleFiles(imageInput.files);
  }, false);

  imageInput.addEventListener("change", function (e) {
    handleFiles(this.files);
  }, false);
}
$( document ).ready(function() {
    main();
});
