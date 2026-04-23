import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env/server";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: serverEnv.r2AccessKeyId,
    secretAccessKey: serverEnv.r2SecretAccessKey,
  },
});

const ONE_HOUR_SECONDS = 60 * 60;

export async function createSignedUploadUrl(objectKey: string, mimeType: string) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: serverEnv.r2BucketName,
      Key: objectKey,
      ContentType: mimeType,
    }),
    { expiresIn: ONE_HOUR_SECONDS }
  );
}

export async function createSignedDownloadUrl(objectKey: string) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: serverEnv.r2BucketName,
      Key: objectKey,
    }),
    { expiresIn: ONE_HOUR_SECONDS }
  );
}

export async function deleteObjectFromR2(objectKey: string) {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: serverEnv.r2BucketName,
      Key: objectKey,
    })
  );
}
