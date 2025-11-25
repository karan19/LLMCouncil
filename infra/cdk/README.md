# LLM Council CDK

Python CDK app that stands up:
- DynamoDB table for conversations
- Lambda for the API (handler: `backend.main.lambda_handler`)
- HTTP API Gateway with optional Cognito JWT authorizer

Configure context in `cdk.json` or via `cdk deploy -c key=value`:
- `cognitoUserPoolId` and `cognitoUserPoolClientId` for auth (leave empty to disable)
- `openrouterApiKeyParam` for the SSM SecureString parameter name holding the OpenRouter key

Common commands (from `infra/cdk`):
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cdk bootstrap   # once per account/region
cdk synth
cdk deploy
```
