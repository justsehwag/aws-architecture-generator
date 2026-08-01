@echo off
echo ============================================
echo  Uploading Frontend to S3 + CloudFront
echo ============================================
echo.

cd /d "c:\AWS ARCH"

echo [1/3] Building Next.js static export...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed. See errors above.
    pause
    exit /b 1
)
echo Build complete.
echo.

echo [2/3] Uploading to S3...
aws s3 sync out/ s3://archgeneratorstack-staticassetsbucketc3095769-ecrwdkrbplh0 --region ap-south-2 --delete
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: S3 upload failed.
    pause
    exit /b 1
)
echo Upload complete.
echo.

echo [3/3] Invalidating CloudFront cache...
aws cloudfront create-invalidation --distribution-id E_PLACEHOLDER --paths "/*" --region us-east-1 2>nul
echo.

echo ============================================
echo  UPLOAD COMPLETE!
echo  Your app is live at:
echo  https://d2u4sv6v5qfhha.cloudfront.net
echo ============================================
echo.
pause
