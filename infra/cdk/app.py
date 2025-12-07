#!/usr/bin/env python3
import os

import aws_cdk as cdk

from llm_council_stack import LlmCouncilStack


app = cdk.App()

stack = LlmCouncilStack(
    app,
    "LLMCouncil",
    env=cdk.Environment(
        account=os.getenv("CDK_DEFAULT_ACCOUNT"),
        region=os.getenv("CDK_DEFAULT_REGION"),
    ),
)

# Add tags to all resources in the stack
cdk.Tags.of(stack).add("Project", "MultiAgent")
cdk.Tags.of(stack).add("Environment", "Production")

app.synth()
