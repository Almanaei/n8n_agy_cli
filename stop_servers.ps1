$nodeProcs = Get-CimInstance Win32_Process -Filter "CommandLine like '%server.js%'"
foreach ($p in $nodeProcs) {
    Write-Host "Stopping node server.js (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

$pyProcs = Get-CimInstance Win32_Process -Filter "CommandLine like '%standalone.main:app%'"
foreach ($p in $pyProcs) {
    Write-Host "Stopping python standalone app (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
