import { AwsClient } from 'aws4fetch'
import type { Env } from '../types/env'
import type { PresignedUrlResult } from '../schema/upload'

//service to generate presigned upload url using aws4fetch

function getR2Client(env: Env) {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    region: 'auto',
    service: 's3',
  })
}

const EXPIRY_SECONDS = 900

async function generatePresignedUploadUrl(
  env: Env,
  objectKey: string,
  contentType: string,
  fileSizeBytes: number,
): Promise<PresignedUrlResult> {
  const client = getR2Client(env)

  const url = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_UPLOADS_RAW_NAME}/${objectKey}?X-Amz-Expires=${EXPIRY_SECONDS}`

  const signedRequest = await client.sign(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileSizeBytes.toString(),
    },
    aws: {
      signQuery: true,
      allHeaders: true,
    },
  })

  return {
    uploadUrl: signedRequest.url,
    objectKey,
    expiresIn: EXPIRY_SECONDS,
  }
}

export { generatePresignedUploadUrl }
