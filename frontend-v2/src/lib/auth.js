import {
    AuthenticationDetails,
    CognitoUser,
    CognitoUserPool,
} from 'amazon-cognito-identity-js';

const TOKEN_STORAGE_KEY = 'llm-council-auth';
const poolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const region = process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_REGION;

export const getStoredTokens = () => {
    if (typeof window === 'undefined') return null; // Handle SSR
    try {
        const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const storeTokens = (tokens) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
};

export const clearTokens = () => {
    if (typeof window === 'undefined') return;
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

// Hosted UI functions removed - using password-based login only
export const buildLoginUrl = () => null;
export const buildLogoutUrl = () => null;

