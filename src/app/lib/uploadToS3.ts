export async function uploadFileDirectlyToS3(file: File, originalFileName: string) {
  if (!file) throw new Error("No file provided")

  // const signResponse = await fetch(`/api/s3/sign?fileName=${encodeURIComponent(originalFileName)}`)

  const signResponse = await fetch(
    `/api/s3/sign?fileName=${encodeURIComponent(originalFileName)}&fileType=${encodeURIComponent(
      file.type
    )}`
  )
  if (!signResponse.ok) throw new Error("Error obteniendo URL firmada.")

  const { uploadUrl, fields } = await signResponse.json()
  const fileKey = fields.key

  const s3FormData = new FormData()
  Object.entries(fields).forEach(([key, value]) => s3FormData.append(key, value as string))

  s3FormData.append("file", file)

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    body: s3FormData,
  })

  if (!uploadRes.ok) {
    console.error(await uploadRes.text())
    throw new Error("Error subiendo archivo a S3.")
  }

  return fileKey
}
