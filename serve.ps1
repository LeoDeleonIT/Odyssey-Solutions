$port = 8080
$root = 'C:\Users\leode\.claude'
$ep   = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Loopback, $port)
$srv  = New-Object System.Net.Sockets.TcpListener($ep)
$srv.Start()
Write-Host "TDC Asset Tracker at http://localhost:$port/TDC-IT-Asset-Tracker.html"

while ($true) {
  if (-not $srv.Pending()) { Start-Sleep -Milliseconds 50; continue }
  $client = $srv.AcceptTcpClient()
  $stream = $client.GetStream()
  $buf    = New-Object byte[] 8192
  $read   = $stream.Read($buf, 0, $buf.Length)
  $req    = [System.Text.Encoding]::ASCII.GetString($buf, 0, $read)
  $line   = ($req -split "`r`n")[0]
  $path   = '/'
  if ($line -match '^GET\s+(\S+)') { $path = $Matches[1].Split('?')[0] }
  if ($path -eq '/' -or $path -eq '') { $path = '/TDC-IT-Asset-Tracker.html' }
  $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
  if (Test-Path $file -PathType Leaf) {
    $body = [System.IO.File]::ReadAllBytes($file)
    $ext  = [System.IO.Path]::GetExtension($file).ToLower()
    $ct   = @{'.html'='text/html; charset=utf-8';'.css'='text/css';'.js'='application/javascript';'.json'='application/json';'.png'='image/png'}[$ext]
    if (-not $ct) { $ct = 'application/octet-stream' }
    $hdr = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  } else {
    $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
    $hdr  = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  }
  $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
  $stream.Write($hb, 0, $hb.Length)
  $stream.Write($body, 0, $body.Length)
  $stream.Flush()
  $client.Close()
}
