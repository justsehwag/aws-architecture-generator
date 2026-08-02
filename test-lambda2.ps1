$body = '{"prompt":"A simple serverless API with Lambda and DynamoDB"}'
try {
    $response = Invoke-WebRequest -Uri 'https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 120
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Body: $($response.Content)"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Body: $errorBody"
}
