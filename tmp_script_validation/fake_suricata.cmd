@echo off
setlocal
set "outdir="
:parse
if "%~1"=="" goto done
if /I "%~1"=="-l" (
  set "outdir=%~2"
  shift
)
shift
goto parse
:done
powershell -NoLogo -NoProfile -Command "$dir=$args[0]; New-Item -ItemType Directory -Force -Path $dir | Out-Null; $p=Join-Path $dir 'eve.json'; @('{\"timestamp\":\"2026-03-16T08:10:00Z\",\"event_type\":\"flow\"}','{\"timestamp\":\"2026-03-16T08:10:01Z\",\"event_type\":\"alert\",\"src_ip\":\"172.165.50.128\",\"dest_ip\":\"172.165.50.130\",\"alert\":{\"signature\":\"Stub Suricata Alert\",\"severity\":3}}') | Set-Content -Path $p -Encoding ascii" "%outdir%"
exit /b 0
