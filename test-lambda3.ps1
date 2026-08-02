$body = '{"prompt":"A simple serverless API with Lambda and DynamoDB"}'
try {
    $response = Invoke-WebRequest -Uri 'https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 300
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Body length: $($response.Content.Length)"
    Write-Host "First 500 chars: $($response.Content.Substring(0, [Math]::Min(500, $response.Content.Length)))"
} catch {
    Write-Host "ERROR Status: $($_.Exception.Response.StatusCode.value__)"
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody"
    } catch {
        Write-Host "Could not read error body: $($_.Exception.Message)"
    }
}
