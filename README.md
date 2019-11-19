# XDesign

Software built ontop of Node.js and Electron to provide front end software for Xmotion CNC plasma cutting machines.

Currently has 4 Workbenches

- [CAD] Uses JetCad's (https://jetcad.io) web cad system. Can import and export DXF files.
- [CAM] In beta, currently can nest parts and post gcode but not ready for full time use
- [Vectorize] Convert a image file to a dxf vector file
- [Machine] Control interface that controls XmotionFirmware

# Known Issues

Currently webgl has an issue where it "loses context" sparatically. It seems to happen more on windows based machines. It causes the Gcode viewer in the Machine workbench to stop working. Other than that, everything is very stable and it's up an running a handful of CNC Plasma cutting machines.

# Building

npm install
npm start

machine_parameters.json is where the machine configuration lies. Unfortunatly there's no documentation on this. Use the other configurations in config/ as a reference.

# Long-Term
I'm currently working steadily on JetCad3D which is parametric 2D and 3D CAD/CAM software. The XmotionFirmware Machine Interface will be build into that (not included yet as of 11/2019) and will completely replace XDesign. I want to get away from Nodejs and Electron for performance issues. JetCad3D is still cross-platform (Builds on Windows, Linux, and OSX) but written in all C/C++...
