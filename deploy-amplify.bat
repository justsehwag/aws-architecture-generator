@echo off
echo ============================================
echo  Deploying to AWS Amplify (Mumbai ap-south-1)
echo ============================================
echo.

cd /d "c:\AWS ARCH"

echo [1/3] Uploading zip to Amplify...
curl -X PUT -T deploy.zip -H "Content-Type: application/zip" "https://aws-amplify-prod-ap-south-1-artifacts.s3.ap-south-1.amazonaws.com/d2gqvarpq3fvys/main/0000000001/DEPLOY/artifacts.zip?X-Amz-Security-Token=IQoJb3JpZ2luX2VjEPf%%2F%%2F%%2F%%2F%%2F%%2F%%2F%%2F%%2F%%2FwEaCmFwLXNvdXRoLTEiRjBEAiAp0m1IbxdZ22qslVeAaBe99oc6MD8Qc8nkE4bhiuxsVAIgXaC7mnBab9MOo3BWDDQEpRsnk1jp1Y7HUqBpS3PGKScq3wQIwP%%2F%%2F%%2F%%2F%%2F%%2F%%2F%%2F%%2F%%2FARAEGgw4MDExODcxNjQ5MTMiDAa2Q1QML3attj0YuiqzBIk5Po1GqLmGPV4lhNZS%%2FBznooDUbGtf9Flm04x0AsqAOd9v0z3NU64Mic6nb8u4vKmZbuPAWMOr%%2Fx3sqayYBjd57WHh56U3FKKoY3H%%2F2gPenRTMtTqlbyN0GGq2c7PuLxY0slLcfluyj5wcGvJv50MExcdo5hq5sKecSz6STAeZn9CphWe3tniBtbWdIor3MZpkwl3UVPPVNz%%2FV0D0VC6bhq7RvXWF5j1p%%2Bd%%2Fcomngaa5hBO%%2BjqGOacA63RZZYfM9BuKwPfA3pDgL5yQLwmHgekDLv7vRzEfXyOa0rU8ZhLYOORMdgrIXSeXVEpWDSRjsAiyTbvPqrU1DZu3%%2F3IqW7UdkH2Uj7d33o4Rp8Pbg0DaRyX4mZRBG0%%2BEYpnE8I1Qf%%2BSgCar5COrXXaC0cFBQQaFv%%2FNptd2o6olP2tFGt0chiyMldu94PNzBR4m%%2BmmjzN1tE0d0H0I1bJuD%%2FE9RoahG7WNNGNRp8IbYRq7oDTILUc6gpSgx0JsVdU6m%%2FQHtZtr5NLItPZtbKt8LS%%2B5ZCWDvbQlzBt9DQ31rcqGowd9OV%%2BYLX%%2FxdmH1xUd1rQi03v6AYAUb3km0712gUzu%%2BMsG70WuoyHg4kx30hDY4y7QnshyiBaCwGJ855rE%%2BWkMt1PmwWSBsHkfr4aIEq362h0qZwUUAK7jjSiekybbG5n6cFpj3lrzwnJukN%%2FbV2BaZrFKekabapcz7GukeDnJNOyA%%2FfZ%%2FwH6fB0QG%%2BJ7gLkoNRN%%2FNbTiMMK7ttMGOqQBQraZ2WDrlRpcHKwhEIYPgQTqRoH5tD1y3OEVzy2qJ%%2F4O8D%%2BdvDI1%%2BiwVid%%2FpXD9TqIdycO8L48hZ0pgPcCCNBHIquybMHFGajAUOaWuw4%%2FwkpXPsPvBBKoBfazZYeo47Rc7JEnnVQl8aKSyLh8xIB1f0fLfE8YVXhrhwhHjaAWTAXFVp%%2BtC5y5fYaoeG4tZ%%2FGG9Ve4o12syhrDXpvQ%%2BzSMB%%2Fjzc%%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260801T091753Z&X-Amz-SignedHeaders=host&X-Amz-Expires=10799&X-Amz-Credential=ASIA3VCTZ6LYSCIUZS6D%%2F20260801%%2Fap-south-1%%2Fs3%%2Faws4_request&X-Amz-Signature=11e267d62c8aca810d63de653b09904c8c1512c3c80cd778cc631f6bf40bafe5"
if %ERRORLEVEL% NEQ 0 (
    echo Upload failed. The presigned URL may have expired.
    echo Please regenerate by running: aws amplify create-deployment --app-id d2gqvarpq3fvys --branch-name main --region ap-south-1
    pause
    exit /b 1
)
echo Upload complete.
echo.

echo [2/3] Starting Amplify deployment...
aws amplify start-deployment --app-id d2gqvarpq3fvys --branch-name main --job-id 1 --region ap-south-1
echo.

echo [3/3] Deployment started!
echo.
echo Your app will be live at: https://main.d2gqvarpq3fvys.amplifyapp.com
echo.
echo Monitor progress at: https://ap-south-1.console.aws.amazon.com/amplify/apps/d2gqvarpq3fvys
echo.
pause
