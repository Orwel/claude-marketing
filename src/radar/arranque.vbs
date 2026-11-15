' Arranca el escucha del bot de Telegram oculto, sin ventana, al iniciar sesión en Windows.
' Se instala con: npm run bot-arranque (copia un acceso directo a la carpeta Inicio del usuario).
Set fso = CreateObject("Scripting.FileSystemObject")
raiz = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = raiz
sh.Run "cmd /c node --use-system-ca src\radar\escucha.mjs >> trabajo\escucha-consola.log 2>&1", 0, False
