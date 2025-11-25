#!/usr/bin/env python3
import os

import aws_cdk as cdk

from llm_council_stack import LlmCouncilStack


app = cdk.App()

LlmCouncilStack(
    app,
    "LlmCouncilStack",
    env=cdk.Environment(
        account=os.getenv("CDK_DEFAULT_ACCOUNT"),
        region=os.getenv("CDK_DEFAULT_REGION"),
    ),
)

app.synth()
