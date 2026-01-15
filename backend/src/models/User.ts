import { randomBytes, randomUUID, type UUID } from "crypto";
import { pool } from "../db/db.js";
import { EmailBuilder } from "../email/email.js";
import argon2 from "argon2";

export type NewUserOptions = { first_name: string; last_name: string; email: string };

export type ExistingUserOptions = { user_id: UUID } | { email: string };

export type UserStatus = "active" | "blocked" | "unverified" | null;

export type UserRole = "student" | "instructor" | "admin";

export class User {
    private is_new: boolean = false;
    user_id: UUID;
    first_name: string;
    last_name: string;
    email: string;
    password_hash: string;
    registration_date: Date;
    status: UserStatus;
    role: UserRole;
    audit_log_enabled: boolean;
    must_change_password: boolean;
    totp_secret: string | null;

    private constructor(
        is_new: boolean,
        user_id: UUID,
        first_name: string,
        last_name: string,
        email: string,
        password_hash: string,
        registration_date: Date,
        status: UserStatus,
        role: UserRole,
        audit_log_enabled: boolean,
        must_change_password: boolean,
        totp_secret: string | null
    ) {
        this.is_new = is_new;
        this.user_id = user_id;
        this.first_name = first_name;
        this.last_name = last_name;
        this.email = email;
        this.password_hash = password_hash;
        this.registration_date = registration_date;
        this.status = status;
        this.role = role;
        this.audit_log_enabled = audit_log_enabled;
        this.must_change_password = must_change_password;
        this.totp_secret = totp_secret;
    }

    static async new(options: NewUserOptions): Promise<User> {
        const new_password = User.generate_password();

        const user = new User(
            true,
            randomUUID(),
            options.first_name,
            options.last_name,
            options.email,
            await argon2.hash(new_password),
            new Date(),
            null,
            "student",
            false,
            true,
            null
        );

        await new EmailBuilder()
            .add_recipient(user)
            .with_subject("Registration complete")
            .with_text_body(
                `Your registration has been completed.\n\nYour temporary password is: ${new_password}\n\nPlease change it as soon as possible!`
            )
            .build_and_send();

        return user;
    }

    static async from_db(options: ExistingUserOptions): Promise<User | null> {
        const row_to_user = (row: any): User | null => {
            try {
                return new User(
                    false,
                    row.user_id,
                    row.first_name,
                    row.last_name,
                    row.email,
                    row.password_hash,
                    new Date(row.registration_date),
                    row.status,
                    row.role,
                    row.audit_log_enabled,
                    row.must_change_password,
                    row.totp_secret || null
                );
            } catch (ignored) {}

            return null;
        };

        if ("user_id" in options) {
            const result = await pool.query(`SELECT * FROM "users" WHERE "user_id" = $1`, [options.user_id]);
            return result.rows.length != 0 ? row_to_user(result.rows[0]) : null;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT * FROM "users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0 ? row_to_user(result.rows[0]) : null;
        }

        return null;
    }

    static async exists(options: ExistingUserOptions): Promise<boolean> {
        if ("user_id" in options) {
            const result = await pool.query(`SELECT 1 FROM "users" WHERE "user_id" = $1`, [options.user_id]);
            return result.rows.length != 0;
        } else if ("email" in options) {
            const result = await pool.query(`SELECT 1 FROM "users" WHERE "email" = $1`, [options.email]);
            return result.rows.length != 0;
        }

        return false;
    }

    async save() {
        if (this.is_new) {
            await pool.query(
                `INSERT INTO "users" ("user_id", "first_name", "last_name", "email", "password_hash", "registration_date", "status", "role", "audit_log_enabled", "must_change_password", "totp_secret")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    this.user_id,
                    this.first_name,
                    this.last_name,
                    this.email,
                    this.password_hash,
                    this.registration_date,
                    this.status,
                    this.role,
                    this.audit_log_enabled,
                    this.must_change_password,
                    this.totp_secret
                ]
            );
            this.is_new = false;
        } else {
            await pool.query(
                `UPDATE "users" SET "first_name" = $2, "last_name" = $3, "email" = $4, "password_hash" = $5, "registration_date" = $6, "status" = $7, "role" = $8, "audit_log_enabled" = $9, "must_change_password" = $10, "totp_secret" = $11
                 WHERE "user_id" = $1`,
                [
                    this.user_id,
                    this.first_name,
                    this.last_name,
                    this.email,
                    this.password_hash,
                    this.registration_date,
                    this.status,
                    this.role,
                    this.audit_log_enabled,
                    this.must_change_password,
                    this.totp_secret
                ]
            );
        }
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

    /**
     * Returns true if the password matches and false if it does not
     * @param input The input password
     */
    async check_password(input: string): Promise<boolean> {
        return await argon2.verify(this.password_hash, input);
    }

    /**
     * Resets the password to a secure default. Does not interact with `must_change_password`
     * @returns The password
     */
    async reset_password(): Promise<string> {
        const new_password = User.generate_password();
        this.password_hash = await argon2.hash(new_password);

        await new EmailBuilder()
            .add_recipient(this)
            .with_subject("Password reset")
            .with_text_body(`Your password has been reset.\n\nYour temporary password is: ${new_password}\n\nPlease change it as soon as possible!`)
            .build_and_send();

        return new_password;
    }

    /**
     * Changes the account password according to user input. Disables `must_change_password`
     * @param input The input password
     */
    async set_password(input: string) {
        this.password_hash = await argon2.hash(input);
        this.must_change_password = false;
    }
}
