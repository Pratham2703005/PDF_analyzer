import { type NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

export interface ExtractResponse {
  extractedText: string
  numPages: number
  fileName: string
  success: boolean
  message?: string
}

const FUNCTION_NAME = process.env.PDF_EXTRACTOR_FUNCTION_NAME || "pdf-extractor"
const REGION = process.env.AWS_REGION || "us-east-1"
const LAMBDA_ENDPOINT = process.env.AWS_LAMBDA_ENDPOINT

const lambdaClient = new LambdaClient({
  region: REGION,
  ...(LAMBDA_ENDPOINT
    ? {
        endpoint: LAMBDA_ENDPOINT,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
        },
      }
    : {}),
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Missing 'file' field in form data" },
        { status: 400 },
      )
    }

    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "Uploaded file must be application/pdf" },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64")

    const command = new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: Buffer.from(
        JSON.stringify({ pdfBase64, fileName: file.name }),
      ),
    })

    const result = await lambdaClient.send(command)

    if (!result.Payload) {
      return NextResponse.json(
        { success: false, message: "Empty response from Lambda" },
        { status: 502 },
      )
    }

    const payloadText = Buffer.from(result.Payload).toString("utf-8")
    const payload = JSON.parse(payloadText)

    if (result.FunctionError) {
      const errMessage =
        typeof payload === "object" && payload !== null
          ? payload.errorMessage || payloadText
          : payloadText
      return NextResponse.json(
        { success: false, message: `Lambda error: ${errMessage}` },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        extractedText: payload.extractedText ?? "",
        numPages: payload.numPages ?? 0,
        fileName: payload.fileName ?? file.name,
        success: true,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in /api/v4/extract:", error)
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to extract PDF",
      },
      { status: 500 },
    )
  }
}
