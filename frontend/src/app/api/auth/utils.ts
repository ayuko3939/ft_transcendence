import bcrypt from "bcryptjs";

const saltRounds = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const match = await bcrypt.compare(password, hashedPassword);
  return match;
}
