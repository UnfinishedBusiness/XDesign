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
let jetcam = new PartView();

const Workbench = "JetCam";
var CurrentFile = null;

function NewJob()
{
		jetcad.JobName = null;
		jetcad.Stack = [];
		jetcad.init();
}
function SaveJob()
{
	if (CurrentFile.includes(".job"))
	{
		fs.writeFile(CurrentFile, jetcad.ExportDXF(),
	    // callback function that is called after writing file is done
	    function(err) {
	        if (err) throw err;
	        // if no error
	        //console.log("Data is written to file successfully.")
		});
	}
}
function SaveJobAs()
{
	const {dialog} = electron.remote;
	dialog.showSaveDialog({
		filters: [
						{ name: 'JOB', extensions: ['job'] },
					]
		}, function (file) {
				if (file !== undefined)
				{
					CurrentFile = file;
					if (file.includes(".job"))
					{
						console.log("Save job file: " + file);
						fs.writeFile(file, jetcad.ExportDXF(),
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
function OpenJob()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
				filters: [
								{ name: 'JOB', extensions: ['job'] },
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
					});
        }
    });
}
function ImportJob()
{
	const {dialog} = electron.remote;
	dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
				filters: [
								{ name: 'JOB', extensions: ['job'] },
							]
    }, function (files) {
        if (files !== undefined) {
        	files.forEach(function(item, index, arr){
						if (item.includes(".job"))
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
			{ label: 'Post',
			click: function() {
				PostGcode();
			}},
			{ label: 'New',
			click: function() {
				NewJob();
			}},
			{ label: 'Open',
			click: function() {
				OpenJob();
			}},
			{ label: 'Save',
			click: function() {
				SaveJob();
			}},
			{ label: 'Save As',
			click: function() {
				SaveJobAs();
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
 menu.append(new MenuItem ({
	 label: 'Options',
	 submenu: [
		 { label: 'Job',
		 click: function() {

		 }},
		 { label: 'Machine',
		 click: function() {

		 }},
		 { label: 'Settings',
		 click: function() {

		 }}
	 ]
}));
 appendWorkbenchMenu(menu);
	Menu.setApplicationMenu(menu);
}

function main()
{
	CreateMenu();
	jetcam.AutoSaveHook = function(){
		//console.log("Autosave Hook!");
		SaveJob();
	};
	jetcam.init();
}
$( document ).ready(function() {
    main();
});
