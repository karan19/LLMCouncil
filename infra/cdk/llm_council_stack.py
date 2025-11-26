from __future__ import annotations

import os
from typing import Any, Dict, Optional

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
            "ConversationsTable",
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
                "OpenRouterParam",
                parameter_name=openrouter_param,
            )

        lambda_fn = _lambda.Function(
            self,
            "ApiHandler",
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
                ),
                exclude=[
                    "infra/cdk/*",
                    "frontend/node_modules/*",
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

        cognito_user_pool_id = self.node.try_get_context("cognitoUserPoolId")
        cognito_user_pool_client_id = self.node.try_get_context("cognitoUserPoolClientId")
        authorizer: Optional[apigwv2.IHttpRouteAuthorizer] = None

        if cognito_user_pool_id and cognito_user_pool_client_id:
            issuer = f"https://cognito-idp.{self.region}.amazonaws.com/{cognito_user_pool_id}"
            authorizer = apigwv2_auth.HttpJwtAuthorizer(
                "JwtAuthorizer",
                jwt_issuer=issuer,
                jwt_audience=[cognito_user_pool_client_id],
            )

        lambda_integration = apigwv2_integrations.HttpLambdaIntegration(
            "LambdaIntegration",
            handler=lambda_fn,
            payload_format_version=apigwv2.PayloadFormatVersion.VERSION_2_0,
        )

        http_api = apigwv2.HttpApi(
            self,
            "CouncilHttpApi",
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
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://localhost:5175",
                    "https://aws-native.d17aa5hezcp3mr.amplifyapp.com",
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

        # Protect GET/POST with authorizer; leave OPTIONS without authorizer to satisfy CORS preflight
        http_api.add_routes(
            path="/{proxy+}",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
            integration=lambda_integration,
            authorizer=authorizer,
        )
        http_api.add_routes(
            path="/",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
            integration=lambda_integration,
            authorizer=authorizer,
        )
        http_api.add_routes(
            path="/{proxy+}",
            methods=[apigwv2.HttpMethod.OPTIONS],
            integration=lambda_integration,
        )
        http_api.add_routes(
            path="/",
            methods=[apigwv2.HttpMethod.OPTIONS],
            integration=lambda_integration,
        )

        lambda_fn.add_permission(
            "AllowHttpApiInvoke",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=http_api.arn_for_execute_api(),
        )

        cdk.CfnOutput(self, "HttpApiUrl", value=http_api.api_endpoint)
        cdk.CfnOutput(self, "ConversationsTableName", value=table.table_name)
