/**
 * AWS Amplify v6 configuration for Cognito authentication.
 * Uses environment variables for Cognito pool settings.
 */
import { type ResourcesConfig } from 'aws-amplify';

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN ||
              'http://localhost:3000/auth/callback',
          ],
          redirectSignOut: [
            process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT ||
              'http://localhost:3000/',
          ],
          responseType: 'code',
          providers: ['Google', 'GitHub' as unknown as 'Google'],
        },
      },
    },
  },
};
