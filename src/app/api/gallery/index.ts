import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"

export async function POST(req: Request) {
  const formData = await req.formData()

  const file = formData.get("file") as File | null
  const startPlace = formData.get("startPlace") as string
  const fileName = formData.get("fileName") as string

  console.log(file, startPlace, fileName)

  // if (!file) {
  //   return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
  // }

  // const bytes = await file.arrayBuffer()
  // const buffer = Buffer.from(bytes)
  // await writeFile(`/tmp/${fileName}.insv`, buffer)

  // 2. Llamar a la mutation de Blitz desde el servidor
  // await createNewElement({
  //   startPlace,
  //   fileName,
  //   filePath: `/tmp/${fileName}.insv`,
  // })

  return NextResponse.json({ success: true })
}
