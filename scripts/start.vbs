Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
Dim oShell : Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = fso.GetAbsolutePathName("..")
cmds=WshShell.RUN("node_modules\.bin\electron .\src\main.js", 0, True)
Set WshShell = Nothing