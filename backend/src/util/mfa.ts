import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function generate_TOTP_secret(email: string): Promise<{ secret: string; qr_code: string; }> {
    const secret = speakeasy.generateSecret({
        name: `Kuhari (${email})`,
        issuer: "Kuhari",
        length: 32
    });

    const qr_code = await QRCode.toDataURL(secret.otpauth_url!);

    return {
        secret: secret.base32,
        qr_code: qr_code
    };
}

export function verify_TOTP_token(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: "base32",
        token: token,
        window: 2
    });
}
