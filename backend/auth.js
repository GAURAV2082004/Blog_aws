const { CognitoJwtVerifier } = require('aws-jwt-verify');

let verifier;
function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID,
      clientId: process.env.CLIENT_ID,
      tokenUse: 'id',
    });
  }
  return verifier;
}

// HTTP API passes groups as a string like "[admins]"; local verification gives an array.
function parseGroups(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).replace(/[[\]]/g, '').split(/[\s,]+/).filter(Boolean);
}

function userFromClaims(c) {
  return {
    sub: c.sub,
    name: c.name || (c.email ? c.email.split('@')[0] : 'Anonymous'),
    email: c.email,
    isAdmin: parseGroups(c['cognito:groups']).includes('admins'),
  };
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';

/**
 * Sets req.user when a valid identity is present. Never rejects: public routes stay open.
 *  1. On AWS: API Gateway's JWT authorizer already verified the token. We only read the claims.
 *  2. Locally with Cognito configured: verify the ID token ourselves.
 *  3. Locally without Cognito: demo tokens "dev:<name>:<reader|admin>" (never accepted on Lambda).
 */
async function attachUser(req, _res, next) {
  try {
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims;
    if (claims) {
      req.user = userFromClaims(claims);
      return next();
    }
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) return next(); // on Lambda, only trust the authorizer

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    if (process.env.USER_POOL_ID && process.env.CLIENT_ID) {
      req.user = userFromClaims(await getVerifier().verify(token));
    } else if (process.env.DEV_AUTH === 'true' && token.startsWith('dev:')) {
      const [, name = 'Guest', role = 'reader'] = token.split(':');
      req.user = { sub: `dev-${slug(name)}`, name, email: `${slug(name)}@demo.local`, isAdmin: role === 'admin' };
    }
  } catch {
    // invalid or expired token: treat as signed out
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to do that.' });
  next();
}

module.exports = { attachUser, requireAuth };
