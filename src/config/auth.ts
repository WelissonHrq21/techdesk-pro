import { type SignOptions } from "jsonwebtoken";
import { env } from "./env";

export const authConfig = {
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  },
};
