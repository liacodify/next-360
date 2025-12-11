import { z } from "zod";

export const fileName = z.string();
export const startPlace = z.string();

export const CreateNewElement = z.object({
  fileName,
  startPlace,
});
