$body = '{"prompt":"A simple serverless API with Lambda and DynamoDB"}'
try {
    $response = Invoke-RestMethod -Uri 'https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 120
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
