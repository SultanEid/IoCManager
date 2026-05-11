import "hash"

rule Apache_WebShell_Case_Study_File_Marker
{
    meta:
        description = "Case-study marker for suspicious web-shell artifact on WIN-SRV01"
        target = "WIN-SRV01 (172.165.50.130)"
    condition:
        hash.sha256(0, filesize) == "7dee6dcc9a1aad758aa1814be206b7ad3aa5de9112d009adbf9769f36fa74c2c"
}
