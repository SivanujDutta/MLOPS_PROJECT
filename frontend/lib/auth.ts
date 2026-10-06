import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function signToken(payload: any, expiresIn: string = "7d"): Promise<string> {
  if (!secretKey) throw new Error("JWT_SECRET environment variable is missing");
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyToken(token: string): Promise<any> {
  if (!secretKey) throw new Error("JWT_SECRET environment variable is missing");
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}
