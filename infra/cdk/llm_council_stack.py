from __future__ import annotations

import os
from typing import Any, Dict, Optional

import jsii
import aws_cdk as cdk
from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_authorizers as apigwv2_auth,
    aws_apigatewayv2_integrations as apigwv2_integrations,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_ssm as ssm,
)
from constructs import Construct


class LlmCouncilStack(Stack):
    """CDK stack for the Lambda + HTTP API + DynamoDB deployment."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any) -> None:
        super().__init__(scope, construct_id, **kwargs)

        table = dynamodb.Table(
            self,
            "Table",
            table_name="LLMCouncilConversations",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
        )

        env_vars: Dict[str, str] = {
            "CONVERSATIONS_TABLE": table.table_name,
        }

        openrouter_param = self.node.try_get_context("openrouterApiKeyParam")
        if openrouter_param:
            env_vars["OPENROUTER_PARAM_NAME"] = openrouter_param
            ssm.StringParameter.from_secure_string_parameter_attributes(
                self,
                "ApiKeyParam",
                parameter_name=openrouter_param,
            )

        cognito_user_pool_id = self.node.try_get_context("cognitoUserPoolId")
        cognito_user_pool_client_id = self.node.try_get_context("cognitoUserPoolClientId")

        # Pass Cognito config to Lambda for JWT verification (needed for Function URL)
        if cognito_user_pool_id:
            env_vars["COGNITO_USER_POOL_ID"] = cognito_user_pool_id
        if cognito_user_pool_client_id:
            env_vars["COGNITO_CLIENT_ID"] = cognito_user_pool_client_id

        # Custom local bundler for when Docker is not available
        @jsii.implements(cdk.ILocalBundling)
        class LocalBundler:
            def try_bundle(self, output_dir: str, *, image, command, **kwargs) -> bool:
                import subprocess
                import shutil
                from pathlib import Path
                
                project_root = Path(__file__).parent.parent.parent
                
                # Install dependencies
                subprocess.run(
                    ["pip", "install", "-r", str(project_root / "backend" / "requirements.txt"), 
                     "-t", output_dir, "--quiet"],
                    check=True
                )
                
                # Copy backend code
                shutil.copytree(
                    project_root / "backend",
                    Path(output_dir) / "backend",
                    dirs_exist_ok=True
                )
                return True

        lambda_fn = _lambda.Function(
            self,
            "Handler",
            function_name="LLMCouncilApi",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="backend.main.lambda_handler",
            code=_lambda.Code.from_asset(
                "../..",
                bundling=cdk.BundlingOptions(
                    image=_lambda.Runtime.PYTHON_3_12.bundling_image,
                    command=[
                        "bash",
                        "-c",
                        "pip install -r backend/requirements.txt -t /asset-output "
                        "&& cp -r backend /asset-output/backend",
                    ],
                    local=LocalBundler(),  # Use local bundling when Docker unavailable
                ),
                exclude=[
                    "infra/cdk/*",
                    "frontend/node_modules/*",
                    "frontend-v2/node_modules/*",
                    "frontend-v2/.next/*",
                    "data/*",
                    ".git/*",
                    "cdk.out/*",
                    ".venv/*",
                ],
            ),
            timeout=Duration.seconds(300),
            memory_size=512,
            environment=env_vars,
        )

        # Add Function URL for long-running requests (bypasses API Gateway 30s timeout)
        fn_url = lambda_fn.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,  # Auth handled in code via JWT
            cors=_lambda.FunctionUrlCorsOptions(
                allowed_origins=[
                    "https://www.multiagent.karankan19.com",
                    "https://multiagent.karankan19.com", 
                    "http://localhost:3000",
                    "http://localhost:3001",
                ],
                allowed_methods=[
                    _lambda.HttpMethod.GET,
                    _lambda.HttpMethod.POST,
                    _lambda.HttpMethod.DELETE,
                ],
                allowed_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Amz-Security-Token",
                    "X-Api-Key",
                ],
                exposed_headers=["*"],
                max_age=Duration.days(1),
            ),
        )

        table.grant_read_write_data(lambda_fn)
        if openrouter_param:
            lambda_fn.add_to_role_policy(
                iam.PolicyStatement(
                    actions=["ssm:GetParameter"],
                    resources=[
                        f"arn:aws:ssm:{self.region}:{self.account}:parameter{openrouter_param}"
                        if openrouter_param.startswith("/")
                        else f"arn:aws:ssm:{self.region}:{self.account}:parameter/{openrouter_param}"
                    ],
                )
            )
        authorizer: Optional[apigwv2.IHttpRouteAuthorizer] = None

        if cognito_user_pool_id and cognito_user_pool_client_id:
            issuer = f"https://cognito-idp.{self.region}.amazonaws.com/{cognito_user_pool_id}"
            authorizer = apigwv2_auth.HttpJwtAuthorizer(
                "Authorizer",
                jwt_issuer=issuer,
                jwt_audience=[cognito_user_pool_client_id],
            )

        lambda_integration = apigwv2_integrations.HttpLambdaIntegration(
            "Integration",
            handler=lambda_fn,
            payload_format_version=apigwv2.PayloadFormatVersion.VERSION_2_0,
        )

        http_api = apigwv2.HttpApi(
            self,
            "Api",
            api_name="LLMCouncilApi",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_headers=[
                    "Authorization",
                    "Content-Type",
                    "X-Amz-Date",
                    "X-Amz-Security-Token",
                    "X-Api-Key",
                ],
                allow_methods=[
                    apigwv2.CorsHttpMethod.OPTIONS,
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.DELETE,
                ],
                allow_origins=[
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://localhost:5175",
                    "https://aws-native.d17aa5hezcp3mr.amplifyapp.com",
                    "https://www.multiagent.karankan19.com",
                    "https://multiagent.karankan19.com",
                ],
                expose_headers=[
                    "Authorization",
                    "Content-Type",
                    "X-Amz-Date",
                    "X-Amz-Security-Token",
                    "X-Api-Key",
                ],
                max_age=Duration.days(10),
            ),
        )

        # Protect GET/POST/DELETE with authorizer; OPTIONS is handled by cors_preflight automatically
        http_api.add_routes(
            path="/{proxy+}",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
            integration=lambda_integration,
            authorizer=authorizer,
        )
        http_api.add_routes(
            path="/",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
            integration=lambda_integration,
            authorizer=authorizer,
        )
        # Note: OPTIONS routes are NOT needed here - cors_preflight handles them at API Gateway level

        lambda_fn.add_permission(
            "AllowHttpApiInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=http_api.arn_for_execute_api(),
        )

        cdk.CfnOutput(self, "HttpApiUrl", value=http_api.api_endpoint)
        cdk.CfnOutput(self, "FunctionUrl", value=fn_url.url)
        cdk.CfnOutput(self, "ConversationsTableName", value=table.table_name)
