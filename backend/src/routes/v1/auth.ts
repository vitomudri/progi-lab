import express from "express";
import argon2 from "argon2";
import jwt, { type SignOptions, type Secret, type JwtPayload } from "jsonwebtoken";
import { User } from "../../models/User.js";
import { env } from "../../env.js";
import { OAuth2Client } from "google-auth-library";

const authRouter = express.Router();

// Google OAuth client (only if GOOGLE_CLIENT_ID is configured)
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

/**
 * REGISTER — POST /api/v1/auth/register
 */
authRouter.post("/register", async (req, res) => {
  try {
    const { ime, prezime, email, lozinka } = req.body;

    if (!ime || !prezime || !email || !lozinka) {
      return res.status(400).json({ error: "Nedostaju podaci." });
    }

    const exists = await User.existsByEmail(email);
    if (exists) {
      return res.status(409).json({ error: "Email već postoji." });
    }

    const hashed = await argon2.hash(lozinka);

    const user = new User({
      Ime: ime,
      Prezime: prezime,
      Email: email,
      Lozinka: hashed,
      MustChangePassword: false
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
authRouter.post("/login", async (req, res) => {
  try {
    const { email, lozinka } = req.body;

    if (!email || !lozinka) {
      return res.status(400).json({ error: "Nedostaju podaci." });
    }

    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Korisnik ne postoji." });
    }

    const ok = await argon2.verify(user.lozinka, lozinka);
    if (!ok) {
      return res.status(401).json({ error: "Pogrešna lozinka." });
    }

    if (user.mustChangePassword) {
      return res.status(403).json({
        error: "Morate promijeniti lozinku pri prvom prijavljivanju.",
        mustChangePassword: true
      });
    }

    // Generiraj JWT token
    const secret: Secret = String(env.JWT_SECRET);
    const options = { expiresIn: env.JWT_EXPIRES_IN || "1d" } as unknown as SignOptions;
    const token = jwt.sign({ id: user.id_korisnika, email: user.email }, secret, options);

    // Pošalji token kao HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24
    });

    return res.json({
      message: "Prijava uspješna!",
      user: {
        id: user.id_korisnika,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Greška na serveru." });
  }
});

/**
 *  GET USER — GET /api/v1/auth/me
 */
authRouter.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Niste prijavljeni." });
    }

    const decoded = jwt.verify(token, String(env.JWT_SECRET)) as JwtPayload;
    const user = await User.getById(decoded.id as number);

    if (!user) {
      return res.status(404).json({ error: "Korisnik nije pronađen." });
    }

    return res.json({
      id: user.id_korisnika,
      ime: user.ime,
      prezime: user.prezime,
      email: user.email,
      skillLevel: "Početnik",
      allergens: [],
      favoriteCuisines: [],
      courseHistory: [],
      notes: ""
    });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(401).json({ error: "Nevažeći ili istekao token." });
  }
});

/**
 *  LOGOUT — POST /api/v1/auth/logout
 */
authRouter.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: false });
  return res.json({ message: "Odjavljeni ste." });
});

/**
 * PROMJENA LOZINKE — POST /api/v1/auth/update-password
 */
authRouter.post("/update-password", async (req, res) => {
  try {
    const { email, staralozinka, novalozinka, potvrdilozinku } = req.body;

    if (!email || !staralozinka || !novalozinka || !potvrdilozinku) {
      return res.status(400).json({ error: "Nedostaju podaci." });
    }

    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Korisnik ne postoji." });
    }

    const ok = await argon2.verify(user.lozinka, staralozinka);
    if (!ok) {
      return res.status(401).json({ error: "Stara lozinka nije točna." });
    }

    if (staralozinka === novalozinka) {
      return res.status(400).json({ error: "Nova lozinka mora biti različita od stare." });
    }

    if (potvrdilozinku !== novalozinka) {
      return res.status(400).json({ error: "Lozinke se ne podudaraju." });
    }

    const newHash = await argon2.hash(novalozinka);
    await user.updatePassword(newHash);

    return res.json({ message: "Lozinka uspješno promijenjena." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Greška na serveru." });
  }
});

// === GOOGLE OAUTH START ===

/**
 * GOOGLE LOGIN — POST /api/v1/auth/google
 */
authRouter.post("/google", async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ error: "Google OAuth nije konfigurisan." });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Nedostaje Google token." });
    }

    // Verifikacija Google tokena
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID as string, // fix for TS
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Neispravan Google token." });
    }

    const email = payload.email;
    const ime = payload.given_name || "";
    const prezime = payload.family_name || "";

    // Provjeri postoji li korisnik
    let user = await User.getByEmail(email);

    if (!user) {
      // Automatska registracija ako ne postoji
      const newUser = new User({
        Ime: ime,
        Prezime: prezime,
        Email: email,
        Lozinka: "",
        MustChangePassword: false
      });

      await newUser.save();
      user = newUser;
    }

    // Generiranje JWT tokena
    const secret: Secret = String(env.JWT_SECRET);
    const options = { expiresIn: env.JWT_EXPIRES_IN || "1d" } as unknown as SignOptions;
    const jwtToken = jwt.sign({ id: user.id_korisnika, email: user.email }, secret, options);

    // Pošalji cookie
    res.cookie("token", jwtToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24
    });

    return res.json({
      message: "Prijava putem Google-a uspješna!",
      user: {
        id: user.id_korisnika,
        ime: user.ime,
        prezime: user.prezime,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Greška pri Google prijavi." });
  }
});
// === GOOGLE OAUTH END ===

export default authRouter;
