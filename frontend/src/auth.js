import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';

const TOKEN_STORAGE_KEY = 'llm-council-auth';
const poolId = import.meta.env.VITE_COGNITO_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const region = import.meta.env.VITE_AWS_REGION || import.meta.env.VITE_REGION;

export const getStoredTokens = () => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeTokens = (tokens) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const parseHashTokens = (hash) => {
  if (!hash || !hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  if (!idToken || !accessToken) return null;
  return {
    idToken,
    accessToken,
    expiresAt: expiresIn ? Date.now() + Number(expiresIn) * 1000 : null,
  };
};

export const passwordSignIn = async (username, password) => {
  if (!poolId || !clientId) {
    throw new Error('Cognito pool/client ID not configured');
  }

  const userPool = new CognitoUserPool({
    UserPoolId: poolId,
    ClientId: clientId,
  });

  const user = new CognitoUser({
    Username: username,
    Pool: userPool,
  });

  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  const session = await new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: resolve,
      onFailure: reject,
    });
  });

  const idToken = session.getIdToken().getJwtToken();
  const accessToken = session.getAccessToken().getJwtToken();
  const exp = session.getIdToken().getExpiration(); // seconds since epoch

  const tokens = {
    idToken,
    accessToken,
    expiresAt: exp ? exp * 1000 : null,
  };
  storeTokens(tokens);
  return tokens;
};

export const buildLoginUrl = () => {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirectUri =
    import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin;
  if (!domain || !clientId) return null;
  const scopes = encodeURIComponent('openid email profile');
  const redirect = encodeURIComponent(redirectUri);
  return `https://${domain}/login?client_id=${clientId}&response_type=token&scope=${scopes}&redirect_uri=${redirect}`;
};

export const buildLogoutUrl = () => {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirectUri =
    import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin;
  if (!domain || !clientId) return null;
  const redirect = encodeURIComponent(redirectUri);
  return `https://${domain}/logout?client_id=${clientId}&logout_uri=${redirect}`;
};
