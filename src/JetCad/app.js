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
var CurrentFile = null;

function NewDrawing()
{
		jetcad.DrawingName = null;
		jetcad.Stack = [];
		jetcad.init();
}
function CloseJetCad()
{
	jetcad.close();
}
function SaveDrawing()
{
	if (CurrentFile.includes(".dxf"))
	{
		fs.writeFile(CurrentFile, jetcad.ExportDXF(),
	    // callback function that is called after writing file is done
	    function(err) {
	        if (err) throw err;
	        // if no error
	        //console.log("Data is written to file successfully.")
		});
	}
	if (CurrentFile.includes(".svg"))
	{
		fs.writeFile(CurrentFile, jetcad.ExportSVG(),
	    // callback function that is called after writing file is done
	    function(err) {
	        if (err) throw err;
	        // if no error
	        //console.log("Data is written to file successfully.")
		});
	}
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
					CurrentFile = file;
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
function OpenDrawing()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
				filters: [
								{ name: 'DXF', extensions: ['dxf'] },
								{ name: 'SVG', extensions: ['svg'] },
							]
    }, function (files) {
        if (files !== undefined) {
					jetcad.Stack = []; //Delete Stack
        	files.forEach(function(item, index, arr){
						CurrentFile = item;
						require('electron').remote.getCurrentWindow().setTitle("JetCad - " + CurrentFile);
						if (item.includes(".dxf"))
						{
							console.log("Opening DXF File: " + item);
							fs.readFile(item, 'utf-8', (err, data) => {
								if(err){
										alert("An error ocurred reading the file :" + err.message);
										return;
								}
								jetcad.ImportDXF(data, false);
							});
						}
						if (item.includes(".svg"))
						{
							console.log("Opening SVG File: " + item);
							fs.readFile(item, 'utf-8', (err, data) => {
								if(err){
										alert("An error ocurred reading the file :" + err.message);
										return;
								}
								jetcad.ImportSVG(data, false);
							});
						}
					});
        }
    });
}
function ImportDrawing()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
				filters: [
								{ name: 'DXF', extensions: ['dxf'] },
								{ name: 'SVG', extensions: ['svg'] },
							]
    }, function (files) {
        if (files !== undefined) {
        	files.forEach(function(item, index, arr){
						if (item.includes(".dxf"))
						{
							console.log("Opening DXF File: " + item);
							fs.readFile(item, 'utf-8', (err, data) => {
								if(err){
										alert("An error ocurred reading the file :" + err.message);
										return;
								}
								jetcad.ImportDXF(data, false);
							});
						}
						if (item.includes(".svg"))
						{
							console.log("Opening SVG File: " + item);
							fs.readFile(item, 'utf-8', (err, data) => {
								if(err){
										alert("An error ocurred reading the file :" + err.message);
										return;
								}
								jetcad.ImportSVG(data, false);
							});
						}
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
			{ label: 'Import',
			click: function() {
				ImportDrawing();
			}},
			{ label: 'Save',
			click: function() {
				SaveDrawing();
			}},
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
	jetcad.AutoSaveHook = function(){
		//console.log("Autosave Hook!");
		SaveDrawing();
	};
	jetcad.init();
}
$( document ).ready(function() {
    main();
});
