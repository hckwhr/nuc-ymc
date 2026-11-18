param([Parameter(Mandatory=$true)][string]$Jobs)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
try {
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    foreach ($job in (Get-Content -LiteralPath $Jobs -Raw -Encoding UTF8 | ConvertFrom-Json)) {
        if (Test-Path -LiteralPath $job.output) { continue }
        $document = $null
        try {
            $document = $word.Documents.Open($job.source, $false, $true, $false)
            $document.ExportAsFixedFormat($job.output, 17)
            Write-Output ([IO.Path]::GetFileName($job.output))
        } finally {
            if ($null -ne $document) { $document.Close(0); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) }
        }
    }
} finally {
    $word.Quit(0)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
}
