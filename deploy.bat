@echo off
echo ============================================
echo  AWS Architecture Generator - Deployment
echo  Region: ap-south-2 (Hyderabad)
echo ============================================
echo.

cd /d "c:\AWS ARCH\infrastructure"

echo [1/5] Installing CDK dependencies...
call npm install
echo.

echo [2/5] Compiling TypeScript...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: TypeScript compilation failed. See errors above.
    echo.
    pause
    exit /b 1
)
echo TypeScript compilation OK.
echo.

echo [3/5] Destroying failed stack (if exists)...
call npx cdk destroy --force 2>nul
echo Stack cleanup done.
echo.

echo [4/5] Bootstrapping CDK in ap-south-2 (Hyderabad)...
call npx cdk bootstrap aws://915233244358/ap-south-2
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Bootstrap may have failed or already exists. Continuing...
    echo.
)

echo [5/5] Deploying infrastructure stack...
call npx cdk deploy --require-approval never
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: CDK deploy failed. See errors above.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Check the outputs above for:
echo   - DistributionDomainName = Your CloudFront URL
echo   - ApiEndpoint = API Gateway URL
echo   - UserPoolId = Cognito User Pool ID
echo.
pause
