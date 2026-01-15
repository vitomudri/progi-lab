import express from "express";
import jwt, { type SignOptions, type Secret, type JwtPayload } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../../models/User.js";
import { env } from "../../env.js";
import ms, { type StringValue } from "ms";
import { generate_TOTP_secret, verify_TOTP_token } from "../../util/mfa.js";
import { require_nototp_auth } from "../../middleware/auth.js";

const auth_router = express.Router();

// Google OAuth client (only if GOOGLE_CLIENT_ID is configured)
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);

/**
 * REGISTER — POST /api/v1/auth/register
 */
auth_router.post("/register", async (req, res) => {
    try {
        const { ime, prezime, email } = req.body;

        if (!ime || !prezime || !email) {
            return res.status(400).json({ error: "Nedostaju podaci." });
        }

        const exists = await User.exists({ email: email });
        if (exists) {
            return res.status(409).json({ error: "Email već postoji." });
        }

        let user = await User.new({
            first_name: ime,
            last_name: prezime,
            email: email
        });

        await user.save();

        return res.json({ message: "Registracija uspješna!" });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Greška na serveru." });
    }
});

/**
 * LOGIN — POST /api/v1/auth/login
 */
auth_router.post("/login", async (req, res) => {
    try {
        const { email, lozinka } = req.body;

        if (!email || !lozinka) {
            return res.status(400).json({ error: "Nedostaju podaci." });
        }

        let user = await User.from_db({ email: email });
        if (!user) {
            return res.status(404).json({ error: "Korisnik ne postoji." });
        }

        if (!(await user.check_password(lozinka))) {
            return res.status(401).json({ error: "Pogrešna lozinka." });
        }

        if (user.must_change_password) {
            return res.status(403).json({
                error: "Morate promijeniti lozinku pri prvom prijavljivanju.",
                mustChangePassword: true
            });
        }

        // Generiraj JWT token
        const secret: Secret = String(env.JWT_SECRET);
        const options = { expiresIn: env.JWT_EXPIRES_IN || "1d" } as unknown as SignOptions;
        const token = jwt.sign({ id: user.user_id, email: user.email, totp_verified: false }, secret, options);

        // Pošalji token kao HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.PRODUCTION,
            maxAge: ms(env.JWT_EXPIRES_IN as StringValue)
        });

        return res.json({
            message: "Prijava uspješna!",
            user: {
                id: user.user_id,
                ime: user.first_name,
                prezime: user.last_name,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Greška na serveru." });
    }
});

/**
 *  LOGOUT — POST /api/v1/auth/logout
 */
auth_router.post("/logout", (req, res) => {
    res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: env.PRODUCTION });
    return res.json({ message: "Odjavljeni ste." });
});

/**
 * PROMJENA LOZINKE — POST /api/v1/auth/update-password
 */
auth_router.post("/update-password", async (req, res) => {
    try {
        const { email, staralozinka, novalozinka, potvrdilozinku } = req.body;

        if (!email || !staralozinka || !novalozinka || !potvrdilozinku) {
            return res.status(400).json({ error: "Nedostaju podaci." });
        }

        const user = await User.from_db({ email: email });
        if (!user) {
            return res.status(404).json({ error: "Korisnik ne postoji." });
        }

        if (!(await user.check_password(staralozinka))) {
            return res.status(401).json({ error: "Stara lozinka nije točna." });
        }

        if (staralozinka === novalozinka) {
            return res.status(400).json({ error: "Nova lozinka mora biti različita od stare." });
        }

        if (potvrdilozinku !== novalozinka) {
            return res.status(400).json({ error: "Lozinke se ne podudaraju." });
        }

        await user.set_password(novalozinka);
        await user.save();

        return res.json({ message: "Lozinka uspješno promijenjena." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Greška na serveru." });
    }
});

/**
 * GOOGLE OAUTH REDIRECT — GET /api/v1/auth/google/redirect
 */
auth_router.get("/google/redirect", (req, res) => {
    const authorizeUrl = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
        include_granted_scopes: true,
    });

    res.redirect(authorizeUrl);
});

/**
 * GOOGLE CALLBACK — GET /api/v1/auth/google/callback
 */
auth_router.get("/google/callback", async (req, res) => {
    try {
        const code = req.query.code as string;
        if (!code) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Exchange code for tokens
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        // Verify ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token!,
            audience: env.GOOGLE_CLIENT_ID!
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const email = payload.email;
        const first_name = payload.given_name || "";
        const last_name = payload.family_name || "";

        // Provjeri postoji li korisnik
        let user = await User.from_db({ email: email });

        if (!user) {
            const new_user = await User.new({
                first_name: first_name,
                last_name: last_name,
                email: email
            });

            await new_user.save();
            user = new_user;
        }

        // Generiranje JWT tokena
        const secret: Secret = String(env.JWT_SECRET);
        const options = { expiresIn: env.JWT_EXPIRES_IN || "1d" } as unknown as SignOptions;
        const jwt_token = jwt.sign({ id: user.user_id, email: user.email, totp_verified: false }, secret, options);

        // Pošalji cookie
        res.cookie("token", jwt_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.PRODUCTION,
            maxAge: ms(env.JWT_EXPIRES_IN as StringValue)
        });

        res.redirect(`${env.CORS_ORIGIN}/participant-profile`);
    } catch (err) {
        console.error("Google callback error:", err);
        res.status(401).json({ error: "Unauthorized" });
    }
});

/**
 * GITHUB OAUTH REDIRECT — GET /api/v1/auth/github/redirect
 */
auth_router.get("/github/redirect", (req, res) => {
    const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.GITHUB_REDIRECT_URI)}&scope=user:email&response_type=code`;
    res.redirect(authorizeUrl);
});

/**
 * GITHUB CALLBACK — GET /api/v1/auth/github/callback
 */
auth_router.get("/github/callback", async (req, res) => {
    try {
        const code = req.query.code as string;
        if (!code) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new URLSearchParams({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: env.GITHUB_REDIRECT_URI
            })
        });

        const tokenData: any = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const userResponse = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userData: any = await userResponse.json();

        let email = userData.email;
        let first_name = userData.name ? userData.name.split(' ')[0] : '';
        let last_name = userData.name ? userData.name.split(' ').slice(1).join(' ') : '';

        if (!email) {
            const emailsResponse = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const emails: any = await emailsResponse.json();
            const primaryEmail = emails.find((e: any) => e.primary)?.email;
            email = primaryEmail || '';
        }

        if (!email) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        let user = await User.from_db({ email: email });

        if (!user) {
            const new_user = await User.new({
                first_name: first_name,
                last_name: last_name,
                email: email
            });

            await new_user.save();
            user = new_user;
        }

        const secret: Secret = String(env.JWT_SECRET);
        const options = { expiresIn: env.JWT_EXPIRES_IN || "1d" } as any as SignOptions;
        const jwt_token = jwt.sign({ id: user.user_id, email: user.email, totp_verified: false }, secret, options);

        res.cookie("token", jwt_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.PRODUCTION,
            maxAge: ms(env.JWT_EXPIRES_IN as StringValue)
        });

        res.redirect(`${env.CORS_ORIGIN}/participant-profile`);
    } catch (err) {
        console.error("GitHub callback error:", err);
        res.status(401).json({ error: "Unauthorized" });
    }
});

auth_router.post("/2fa/request-setup", require_nototp_auth, async (req, res) => {
    const user = req.user!;
    const { secret, qr_code } = await generate_TOTP_secret(user.email);

    return res.json({ secret, qr_code });
});

auth_router.post("/2fa/verify-setup", require_nototp_auth, async (req, res) => {
    const user = req.user!;
    const { secret, token } = req.body;

    if (!secret || !token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!verify_TOTP_token(secret, token)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    user.totp_secret = secret;
    await user.save();

    return res.json({ message: "2fa enabled" });
});

auth_router.post("/2fa/disable", require_nototp_auth, async (req, res) => {
    const user = req.user!;
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.totp_secret) {
        return res.status(409).json({ error: "Conflict" });
    }

    if (!verify_TOTP_token(user.totp_secret, token)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    user.totp_secret = null;
    await user.save();

    return res.json({ message: "2FA disabled" });
});

auth_router.get("/2fa/status", require_nototp_auth, (req, res) => {
    const user = req.user!;
    return res.json({ totp_enabled: user.totp_secret !== null });
});

auth_router.post("/2fa/verify-token", require_nototp_auth, async (req, res) => {
    const user = req.user!;
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.totp_secret) {
        return res.status(409).json({ error: "Conflict" });
    }

    if (!verify_TOTP_token(user.totp_secret, token)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const secret: Secret = String(env.JWT_SECRET);
    const options = { expiresIn: env.JWT_EXPIRES_IN || "1d" } as any as SignOptions;
    const jwt_token = jwt.sign({ id: user.user_id, email: user.email, totp_verified: true }, secret, options);

    res.cookie("token", jwt_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.PRODUCTION,
        maxAge: ms(env.JWT_EXPIRES_IN as StringValue)
    });

    return res.json({ message: "Fully authenticated" });
});

export default auth_router;
