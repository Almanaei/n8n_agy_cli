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

$cfManagerProcs = Get-CimInstance Win32_Process -Filter "CommandLine like '%cloudflared_manager.js%'"
foreach ($p in $cfManagerProcs) {
    Write-Host "Stopping cloudflared_manager (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

$cfProcs = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'"
foreach ($p in $cfProcs) {
    Write-Host "Stopping cloudflared.exe (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

$n8nProcs = Get-CimInstance Win32_Process -Filter "CommandLine like '%n8n%'"
foreach ($p in $n8nProcs) {
    Write-Host "Stopping n8n (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

# Kill anything remaining on ports 3000, 5678, 8000
foreach ($port in @(3000, 5678, 8000)) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        foreach ($c in $conn) {
            if ($c.OwningProcess) {
                Write-Host "Stopping process ($($c.OwningProcess)) on port $port"
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
