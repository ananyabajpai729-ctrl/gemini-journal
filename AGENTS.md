# Security Constitution

## Security-first development
Before implementing security-sensitive functionality, identify relevant
threats and security risks.

## Secrets
- Never hardcode API keys, passwords, tokens, credentials, or other secrets.
- Never expose server-side secrets to client-side code.
- Use secure server-side secret management.

## Authentication
- Use Firebase Authentication for user identity.
- Authentication and authorization are separate concerns.

## Authorization and data isolation
- Private journal data belongs to exactly one authenticated Firebase UID.
- Firestore Security Rules must enforce per-user data isolation.
- Never trust a user ID supplied by the client for authorization.
- Authorization decisions must use the authenticated user's identity.

## Least privilege
Use the minimum permissions required for each service, API, and credential.

## Input security
Validate and safely handle all untrusted user input.

## Gemini security
Consider prompt injection and malicious input when integrating Gemini.
Do not assume that user-provided text is trustworthy.

## Privacy
Do not log API keys, authentication tokens, or private journal content.

## Client/server separation
Keep sensitive operations and secrets on the server.
Never send server-side secrets to the browser.

## Security review
Before considering a feature complete, review:
- authentication
- authorization
- cross-user data leakage
- secret exposure
- Firestore Security Rules
- input handling
- excessive permissions

For security-sensitive implementation decisions, briefly explain the
security reasoning.
