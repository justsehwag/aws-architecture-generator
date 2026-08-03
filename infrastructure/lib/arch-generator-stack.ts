import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class ArchGeneratorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // Cognito User Pool - Authentication
    // ============================================================
    const userPool = new cognito.UserPool(this, 'ArchGeneratorUserPool', {
      userPoolName: 'arch-generator-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'ArchGeneratorUserPoolClient', {
      userPool,
      userPoolClientName: 'arch-generator-web-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:3000/auth/callback', 'https://app.example.com/auth/callback'],
        logoutUrls: ['http://localhost:3000', 'https://app.example.com'],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // NOTE: Social identity providers (Google, GitHub) require real OAuth credentials.
    // Uncomment and configure these after obtaining client IDs and secrets from
    // Google Cloud Console and GitHub OAuth Apps settings.
    //
    // const googleProvider = new cognito.UserPoolIdentityProviderGoogle(...)
    // const githubProvider = new cognito.UserPoolIdentityProviderOidc(...)

    // User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(this, 'ArchGeneratorUserPoolDomain', {
      userPool,
      cognitoDomain: { domainPrefix: 'arch-gen-915233' },
    });

    // ============================================================
    // S3 Buckets
    // ============================================================

    // S3 Bucket for static frontend assets
    const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // S3 Bucket for diagram files
    const diagramFilesBucket = new s3.Bucket(this, 'DiagramFilesBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // Note: 50 MB file size limit is enforced at the application layer
    // (see src/lib/storage/s3.ts validateFileSize function)

    // ============================================================
    // CloudFront Distribution with OAI
    // ============================================================

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'StaticAssetsOAI',
      { comment: 'OAI for arch-generator static assets' }
    );

    staticAssetsBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'ArchGeneratorDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(staticAssetsBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // ============================================================
    // DynamoDB Tables
    // ============================================================

    // Diagrams Table
    const diagramsTable = new dynamodb.Table(this, 'DiagramsTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'TTL',
    });

    // GSI for querying diagrams by diagramId
    diagramsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1-DiagramId',
      partitionKey: { name: 'diagramId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Versions Table
    const versionsTable = new dynamodb.Table(this, 'VersionsTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Templates Table
    const templatesTable = new dynamodb.Table(this, 'TemplatesTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying user's custom templates
    templatesTable.addGlobalSecondaryIndex({
      indexName: 'GSI-UserTemplates',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================================
    // IAM Role for Lambda Functions (Least Privilege)
    // ============================================================

    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // DynamoDB access policy
    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DynamoDBAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [
          diagramsTable.tableArn,
          `${diagramsTable.tableArn}/index/*`,
          versionsTable.tableArn,
          `${versionsTable.tableArn}/index/*`,
          templatesTable.tableArn,
          `${templatesTable.tableArn}/index/*`,
        ],
      })
    );

    // S3 access policy for diagram files
    lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3DiagramFilesAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          diagramFilesBucket.bucketArn,
          `${diagramFilesBucket.bucketArn}/*`,
        ],
      })
    );

    // ============================================================
    // Lambda Functions (29-second timeout)
    // ============================================================

    const commonLambdaProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(29),
      memorySize: 512,
      role: lambdaExecutionRole,
      environment: {
        DIAGRAMS_TABLE: diagramsTable.tableName,
        VERSIONS_TABLE: versionsTable.tableName,
        TEMPLATES_TABLE: templatesTable.tableName,
        DIAGRAM_FILES_BUCKET: diagramFilesBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
        REGION: cdk.Aws.REGION,
      },
    };

    // Generate Lambda - Prompt processing and LLM interaction (uses NodejsFunction for TypeScript compilation)
    const generateFn = new lambdaNodejs.NodejsFunction(this, 'GenerateLambda', {
      functionName: 'arch-generator-generate',
      entry: 'lambda/generate/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(29),
      memorySize: 1024,
      role: lambdaExecutionRole,
      environment: {
        ...commonLambdaProps.environment as Record<string, string>,
        BEDROCK_MODEL_ID: 'global.anthropic.claude-sonnet-4-6',
        BEDROCK_REGION: 'ap-south-2',
      },
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: [],
      },
      description: 'Processes natural language prompts via Bedrock and produces architecture specs',
    });

    // Grant Generate Lambda permission to invoke Bedrock models
    generateFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'BedrockInvokeModel',
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:*:${cdk.Aws.ACCOUNT_ID}:inference-profile/*`,
          'arn:aws:bedrock:*::foundation-model/anthropic.*',
          'arn:aws:bedrock:*::foundation-model/amazon.*',
        ],
      })
    );

    // ============================================================
    // Draw.io Generator Lambda (Function URL, no API Gateway)
    // ============================================================

    const drawioGeneratorFn = new lambdaNodejs.NodejsFunction(this, 'DrawioGeneratorLambda', {
      functionName: 'arch-generator-drawio',
      entry: 'lambda/drawio-generator/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(900),
      memorySize: 1024,
      environment: {
        BEDROCK_MODEL_ID: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        BEDROCK_REGION: 'us-east-1',
      },
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: [],
      },
      description: 'Generates Draw.io XML directly from architecture prompts via Bedrock Claude Sonnet',
    });

    // Grant Draw.io Generator Lambda permission to invoke Bedrock models
    drawioGeneratorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          'arn:aws:bedrock:*::foundation-model/anthropic.*',
          `arn:aws:bedrock:*:${cdk.Aws.ACCOUNT_ID}:inference-profile/*`,
        ],
      })
    );

    // Function URL with CORS
    const drawioFunctionUrl = drawioGeneratorFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type'],
      },
    });

    // Render Lambda - Draw.io MCP diagram rendering
    const renderFn = new lambda.Function(this, 'RenderLambda', {
      ...commonLambdaProps,
      functionName: 'arch-generator-render',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/render'),
      description: 'Converts architecture specs to Draw.io XML via MCP server',
      memorySize: 1024,
    } as lambda.FunctionProps);

    // Analysis Lambda - Well-Architected analysis
    const analysisFn = new lambda.Function(this, 'AnalysisLambda', {
      ...commonLambdaProps,
      functionName: 'arch-generator-analysis',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/analysis'),
      description: 'Evaluates architectures against Well-Architected Framework',
    } as lambda.FunctionProps);

    // Cost Lambda - Cost estimation
    const costFn = new lambda.Function(this, 'CostLambda', {
      ...commonLambdaProps,
      functionName: 'arch-generator-cost',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/cost'),
      description: 'Calculates estimated monthly costs for architecture services',
    } as lambda.FunctionProps);

    // Export Lambda - Multi-format export
    const exportFn = new lambda.Function(this, 'ExportLambda', {
      ...commonLambdaProps,
      functionName: 'arch-generator-export',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/export'),
      description: 'Exports diagrams to PNG, SVG, PDF, JSON, Markdown formats',
      memorySize: 1024,
    } as lambda.FunctionProps);

    // IaC Lambda - Infrastructure as Code generation
    const iacFn = new lambda.Function(this, 'IaCLambda', {
      ...commonLambdaProps,
      functionName: 'arch-generator-iac',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/iac'),
      description: 'Generates Terraform, CDK, and CloudFormation code from diagrams',
    } as lambda.FunctionProps);

    // Import Lambda - File import and validation
    const importFn = new lambda.Function(this, 'ImportLambda', {
      ...commonLambdaProps,
      functionName: 'arch-generator-import',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/import'),
      description: 'Validates and imports .drawio files',
    } as lambda.FunctionProps);

    // ============================================================
    // API Gateway (HTTP API) with Cognito JWT Authorizer
    // ============================================================

    const httpApi = new apigatewayv2.HttpApi(this, 'ArchGeneratorApi', {
      apiName: 'arch-generator-api',
      description: 'Cloud Architecture Generator HTTP API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Authorization', 'Content-Type', 'X-Amz-Date', 'X-Api-Key'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Cognito JWT Authorizer
    const authorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
        identitySource: ['$request.header.Authorization'],
      }
    );

    // API Gateway throttle settings: 1000 requests/second/user
    const stage = httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (stage) {
      stage.addPropertyOverride('DefaultRouteSettings', {
        ThrottlingBurstLimit: 1000,
        ThrottlingRateLimit: 1000,
      });
    }

    // ============================================================
    // API Routes
    // ============================================================

    // Generate diagram — no authorizer so frontend can call directly (avoids Amplify 25s SSR limit)
    httpApi.addRoutes({
      path: '/api/diagrams/generate',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('GenerateIntegration', generateFn),
    });

    // Import diagram
    httpApi.addRoutes({
      path: '/api/diagrams/import',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('ImportIntegration', importFn),
      authorizer,
    });

    // Diagram CRUD operations
    httpApi.addRoutes({
      path: '/api/diagrams/{id}',
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.PUT, apigatewayv2.HttpMethod.DELETE],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('RenderIntegration', renderFn),
      authorizer,
    });

    // Diagram versions
    httpApi.addRoutes({
      path: '/api/diagrams/{id}/versions',
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('RenderVersionsIntegration', renderFn),
      authorizer,
    });

    // Diagram version restore
    httpApi.addRoutes({
      path: '/api/diagrams/{id}/versions/{vid}/restore',
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('RenderRestoreIntegration', renderFn),
      authorizer,
    });

    // Export
    httpApi.addRoutes({
      path: '/api/diagrams/{id}/export',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('ExportIntegration', exportFn),
      authorizer,
    });

    // Analysis
    httpApi.addRoutes({
      path: '/api/diagrams/{id}/analysis',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('AnalysisIntegration', analysisFn),
      authorizer,
    });

    // Cost estimation
    httpApi.addRoutes({
      path: '/api/diagrams/{id}/cost',
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.PUT],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('CostIntegration', costFn),
      authorizer,
    });

    // IaC generation
    httpApi.addRoutes({
      path: '/api/diagrams/{id}/iac',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('IaCIntegration', iacFn),
      authorizer,
    });

    // Templates
    httpApi.addRoutes({
      path: '/api/templates',
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('TemplatesIntegration', renderFn),
      authorizer,
    });

    // ============================================================
    // Stack Outputs
    // ============================================================

    new cdk.CfnOutput(this, 'DrawioGeneratorFunctionUrl', {
      value: drawioFunctionUrl.url,
      description: 'Function URL for the Draw.io XML generator Lambda',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name for the frontend',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'HTTP API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'DiagramFilesBucketName', {
      value: diagramFilesBucket.bucketName,
      description: 'S3 bucket for diagram files',
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: staticAssetsBucket.bucketName,
      description: 'S3 bucket for static frontend assets',
    });

    new cdk.CfnOutput(this, 'DiagramsTableName', {
      value: diagramsTable.tableName,
      description: 'DynamoDB table for diagram metadata',
    });

    new cdk.CfnOutput(this, 'VersionsTableName', {
      value: versionsTable.tableName,
      description: 'DynamoDB table for diagram versions',
    });

    new cdk.CfnOutput(this, 'TemplatesTableName', {
      value: templatesTable.tableName,
      description: 'DynamoDB table for templates',
    });
  }
}
