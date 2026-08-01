@echo off
echo Cleaning up orphaned resources from failed deployment...
echo.

echo Deleting orphaned S3 bucket...
aws s3 rb s3://arch-generator-files-915233244358 --force --region ap-south-2 2>nul
echo.

echo Deleting orphaned DynamoDB tables...
aws dynamodb delete-table --table-name ArchGenerator-Diagrams --region ap-south-2 2>nul
aws dynamodb delete-table --table-name ArchGenerator-Versions --region ap-south-2 2>nul
aws dynamodb delete-table --table-name ArchGenerator-Templates --region ap-south-2 2>nul
echo.

echo Deleting failed CloudFormation stack...
aws cloudformation delete-stack --stack-name ArchGeneratorStack --region ap-south-2 2>nul
echo Waiting for stack deletion...
aws cloudformation wait stack-delete-complete --stack-name ArchGeneratorStack --region ap-south-2 2>nul
echo.

echo Cleanup complete! Now run deploy.bat
pause
