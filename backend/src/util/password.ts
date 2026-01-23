import { randomBytes } from "crypto";

export default function generate_password(length: number = 12): string {
    const charset = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    const bytes = randomBytes(length);
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset[bytes.at(i)! % charset.length];
    }
    return password;
}
