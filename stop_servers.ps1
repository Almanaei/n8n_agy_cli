# Safe server shutdown targeting ONLY specific listening ports (3000, 5678, 8000)
# and isolated background server scripts, NEVER user terminal windows.

foreach ($port in @(3000, 5678, 8000)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            if ($c.OwningProcess -and $c.OwningProcess -ne $PID) {
                $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -ne "pwsh" -and $proc.ProcessName -ne "powershell" -and $proc.ProcessName -ne "cmd") {
                    Write-Host "Safely stopping listening process $($proc.ProcessName) (PID $($c.OwningProcess)) on port $port"
                    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}
