import { randomBytes, randomUUID, type UUID } from "crypto";
import { pool } from "../db/initDatabase.js";

export type NewUserOptions = { name: string; surname: string; email: string; };

export type ExistingUserOptions =
    | { id: UUID;  }
    | { email: string; };

export class User {
    id: UUID;
    name: string;
    surname: string;
    email: string;
    password: string;

    constructor(options: NewUserOptions) {
        this.id = randomUUID();
        this.name = options.name;
        this.surname = options.surname;
        this.email = options.email;
        this.password = User.generate_password();
    }

    private static generate_password(length: number = 12): string {
        const charset = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
        const bytes = randomBytes(length);
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset[bytes.at(i)! % charset.length];
        }
        return password;
    }

    static async get_from_db(options: ExistingUserOptions) {
        if ("id" in options) {

        } else if ("email" in options) {

        }
    }

    // static async getByEmail(email: string): Promise<User | null> {
    //     const result = await pool.query(`SELECT * FROM "Korisnik" WHERE "Email" = $1`, [email]);
    //     return result.rows.length > 0 ? new User(result.rows[0]) : null;
    // }

    // static async existsByEmail(email: string): Promise<boolean> {
    //     const result = await pool.query(`SELECT 1 FROM "Korisnik" WHERE "Email" = $1`, [email]);
    //     return result.rows.length > 0;
    // }

    // async save(): Promise<void> {
    //     await pool.query(`INSERT INTO "Korisnik" ("Ime", "Prezime", "Email", "Lozinka") VALUES ($1, $2, $3, $4)`, [
    //         this.ime,
    //         this.prezime,
    //         this.email,
    //         this.lozinka
    //     ]);
    // }

    // static async getById(id: number): Promise<User | null> {
    //     const result = await pool.query(`SELECT * FROM "Korisnik" WHERE "ID_korisnika" = $1`, [id]);
    //     return result.rows.length > 0 ? new User(result.rows[0]) : null;
    // }
}
