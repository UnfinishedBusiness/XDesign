const electron = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var MotionControlPort;
var $ = require('jquery');
var fs = require('fs');
let DxfParser = require('dxf-parser');
let DxfWriter = require('dxf-writer');
let notification = new Notification();
let navigation;
let fonts;
let jetcad = new JetCad();
let jetcad_tools = new JetCad_Tools();

const Workbench = "JetCad";

function NewDrawing()
{
	var drawing = prompt("Drawing Name?", "New Drawing");
	if (drawing != null)
	{
		jetcad.DrawingName = drawing;
		jetcad.Stack = [];
		jetcad.init();
	}
}
function CloneDrawing()
{
	var drawing = prompt("Drawing Name?", "New Drawing");
	if (drawing != null)
	{
		jetcad.DrawingName = drawing;
		jetcad.SaveDrawing();
	}
}
function CloseJetCad()
{
	jetcad.close();
}
function OpenDrawing()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
    }, function (files) {
        if (files !== undefined) {
					jetcad.Stack = []; //Delete Stack
        	files.forEach(function(item, index, arr){
						console.log("Opening File: " + item);
						fs.readFile(item, 'utf-8', (err, data) => {
			        if(err){
			            alert("An error ocurred reading the file :" + err.message);
			            return;
			        }
							jetcad.ImportDXF(data, false);
		    		});
					});
        }
    });
}
function DeleteDrawing(file_name)
{
	if (confirm('Are you sure you want to delete this drawing?')) {
    backend_cmd_async({ cmd: "delete_drawing", drawing_name: file_name }, function(){
			Browse();
		});
	} else {

	};
}
function DrawMode()
{
	jetcad.init();
}
function ToolpathMode()
{
	$("#Content").html("<div id='markdown' style='margin: auto; width: 80%; height: 80%; margin-top: 10px;'></div>");
	$("#markdown").html("<iframe frameborder='0' src='https://jetcad.io/docs/?toolpath_mode' style='overflow:hidden;height:" + ($(window).height() - 150) + "px;width: 100%'></iframe>");
}
function VectorizeMode()
{

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
  markup += 'Drawing Name: <input type="text" id="drawing-name" value="default" style="width: 200px;"><br>';
  markup += '<input type="button" id="create-drawing" value="Create Drawing" style="width: 200px;"><br>';
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

    jetcad.DrawingName = document.getElementById("drawing-name").value;
		jetcad.Stack = [];
		jetcad.init();
    navigation.setPageNoAction("Draw");
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
function Browse()
{
	CloseJetCad();
	$("#Content").html(" ");
	backend_cmd_async({cmd: "list_drawings"}, function(drawings){
		for (var i = 0; i < drawings.length; i++)
		{
			backend_cmd_async({cmd: "read_drawing", drawing_name: drawings[i] }, function(data, cmd){
				var entities = JSON.parse(data.data);
				var controls_markup = "<button onclick='OpenDrawing(\"" + cmd.drawing_name + "\");' class='reg_button' type='button'>Open</button>";
				controls_markup += "<button onclick='DeleteDrawing(\"" + cmd.drawing_name + "\");' class='reg_button' type='button'>Delete</button>";
				//controls_markup += "<button onclick='DownloadDrawing(\"" + cmd.drawing_name + "\");' class='reg_button' type='button'>Download</button>";
				var drawing_title = "<center><b>" + cmd.drawing_name + "</b></center>";
				var svg_container = jetcad.MakerJS.exporter.toSVG(entities);
				$("#Content").append("<div class=\"col-lg-3 col-xs-6\">" + drawing_title + "<div style='background-color: white; width: 280px; height: 250px; border-style: solid; border-radius: 8px;' id='drawing'>" + svg_container + "</div><div>" + controls_markup + "</div></div>");
				$( "svg" ).each(function() {
					var s = $(this);
					s.attr("height", "100%");
					s.attr("width", "100%");
					var view = svgPanZoom(s.get()[0]);
					view.zoomOut(0.5);
				});
			});
		}
	});

}
function CreateMenu()
{
	const {remote} = require('electron');
  const {Menu, MenuItem} = remote;

  const menu = new Menu();
  menu.append(new MenuItem ({
    label: 'File',
		submenu: [
			{ label: 'New',
			click: function() {
				NewDrawing();
			}},
			{ label: 'Open',
			click: function() {
				OpenDrawing();
			}},
			{ label: 'Save'

			},
			{ label: 'Save As',
			click: function() {
				SaveDrawingAs();
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

function main()
{
	CreateMenu();
	DrawMode();
}
$( document ).ready(function() {
    main();
});
