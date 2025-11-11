import { randomBytes, randomUUID, type UUID } from "crypto";
import { pool } from "../db/initDatabase.js";

export type NewUserOptions = { name: string; surname: string; email: string };

export type ExistingUserOptions = { id: UUID } | { email: string };

export type UserStatus = "active" | "blocked" | "unverified";

export type UserRole = "student" | "instructor" | "admin";

export class User {
    private is_new: boolean = false;
    user_id: UUID;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
    registration_date: Date;
    status?: UserStatus;
    role: UserRole;
    audit_log_enabled: boolean;
    must_change_password: boolean;

    constructor(options: NewUserOptions) {
        this.is_new = true;
        this.user_id = randomUUID();
        this.first_name = options.name;
        this.last_name = options.surname;
        this.email = options.email;
        this.password_hash = User.generate_password();
        this.registration_date = new Date();
        this.role = "student";
        this.audit_log_enabled = false;
        this.must_change_password = true;
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

    static async get_from_db(options: ExistingUserOptions): Promise<User | null> {
        if ("id" in options) {
            const result = await pool.query(`SELECT * FROM "Users" WHERE "id" = $1`, [options.id]);
            return result.rows.length != 0 ? (result.rows[0] as User) : null;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT * FROM "Users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0 ? (result.rows[0] as User) : null;
        }

        return null;
    }

    static async exists_in_db(options: ExistingUserOptions): Promise<boolean> {
        if ("id" in options) {
            const result = await pool.query(`SELECT 1 FROM "Users" WHERE "id" = $1`, [options.id]);
            return result.rows.length != 0;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT 1 FROM "Users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0;
        }

        return false;
    }

    async save(): Promise<void> {
        if (this.is_new) {
            await pool.query(
                `INSERT INTO "Users" ("id", "first_name", "last_name", "email", "password_hash", "registration_date", "role", "audit_log_enabled", "must_change_password")
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [this.user_id, this.first_name, this.last_name, this.email, this.password_hash, this.registration_date, this.role, this.audit_log_enabled, this.must_change_password]
            );
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "Users" SET "first_name" = $2, "last_name" = $3, "email" = $4, "password_hash" = $5, "registration_date" = $6, "role" = $7, "audit_log_enabled" = $8, "must_change_password" = $9
                 WHERE "id" = $1`,
                [this.user_id, this.first_name, this.last_name, this.email, this.password_hash, this.registration_date, this.role, this.audit_log_enabled, this.must_change_password]
            );
        }
    }
}
