import { describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import { User } from "../../models/User.js";
import { pool } from "../../db/db.js";
import { randomUUID } from "crypto";
import argon2 from "argon2";

describe("User Model", () => {
    const testEmail = "test@example.com";
    const testEmail2 = "test2@example.com";

    const cleanupTestUser = async (email: string) => {
        await pool.query('DELETE FROM "users" WHERE "email" = $1', [email]);
    };

    const getUserFromDb = async (email: string) => {
        const result = await pool.query('SELECT * FROM "users" WHERE "email" = $1', [email]);
        return result.rows[0] || null;
    };

    beforeAll(async () => {
        await cleanupTestUser(testEmail);
        await cleanupTestUser(testEmail2);
    }, 30000);

    afterEach(async () => {
        await cleanupTestUser(testEmail);
        await cleanupTestUser(testEmail2);
    }, 30000);

    describe("User.new()", () => {
        it("should create a new user with correct properties", async () => {
            const newUserOptions = {
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            };

            const user = await User.new(newUserOptions, false);

            expect(user.first_name).toBe("John");
            expect(user.last_name).toBe("Doe");
            expect(user.email).toBe(testEmail);
            expect(user.role).toBe("student");
            expect(user.status).toBeNull();
            expect(user.must_change_password).toBe(true);
            expect(user.totp_secret).toBeNull();
            expect(user.user_id).toBeDefined();
            expect(user.password_hash).toBeDefined();
            expect(user.registration_date).toBeDefined();
        }, 30000);

        it("should generate a unique password hash", async () => {
            const newUserOptions = {
                first_name: "Jane",
                last_name: "Smith",
                email: testEmail
            };

            const user = await User.new(newUserOptions, false);

            expect(user.password_hash).toBeDefined();
            expect(user.password_hash.length).toBeGreaterThan(0);
            expect(user.password_hash).toMatch(/^\$argon2/);
        }, 30000);

        it("should generate different password hashes for different users", async () => {
            const user1 = await User.new({
                first_name: "User",
                last_name: "One",
                email: testEmail
            }, false);

            await cleanupTestUser(testEmail);

            const user2 = await User.new({
                first_name: "User",
                last_name: "Two",
                email: testEmail
            }, false);

            expect(user1.password_hash).not.toBe(user2.password_hash);
        }, 30000);
    });

    describe("User.save()", () => {
        it("should insert new user into database", async () => {
            const user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            await user.save();

            const dbUser = await getUserFromDb(testEmail);
            expect(dbUser).toBeDefined();
            expect(dbUser.first_name).toBe("John");
            expect(dbUser.last_name).toBe("Doe");
            expect(dbUser.email).toBe(testEmail);
            expect(dbUser.user_id).toBe(user.user_id);
            expect(dbUser.role).toBe("student");
        }, 30000);

        it("should update existing user in database", async () => {
            let user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            await user.save();

            user.first_name = "Jane";
            user.last_name = "Smith";
            user.role = "instructor";
            user.status = "active";
            await user.save();

            const dbUser = await getUserFromDb(testEmail);
            expect(dbUser.first_name).toBe("Jane");
            expect(dbUser.last_name).toBe("Smith");
            expect(dbUser.role).toBe("instructor");
            expect(dbUser.status).toBe("active");
        }, 30000);
    });

    describe("User.from_db()", () => {
        it("should retrieve user by email", async () => {
            const originalUser = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            await originalUser.save();

            const retrievedUser = await User.from_db({ email: testEmail });

            expect(retrievedUser).toBeDefined();
            expect(retrievedUser?.first_name).toBe("John");
            expect(retrievedUser?.last_name).toBe("Doe");
            expect(retrievedUser?.email).toBe(testEmail);
            expect(retrievedUser?.user_id).toBe(originalUser.user_id);
        }, 30000);

        it("should retrieve user by user_id", async () => {
            const originalUser = await User.new({
                first_name: "Jane",
                last_name: "Smith",
                email: testEmail
            }, false);

            await originalUser.save();

            const retrievedUser = await User.from_db({ user_id: originalUser.user_id });

            expect(retrievedUser).toBeDefined();
            expect(retrievedUser?.first_name).toBe("Jane");
            expect(retrievedUser?.last_name).toBe("Smith");
            expect(retrievedUser?.user_id).toBe(originalUser.user_id);
        }, 30000);

        it("should return null for non-existent email", async () => {
            const user = await User.from_db({ email: "nonexistent@example.com" });
            expect(user).toBeNull();
        }, 30000);

        it("should return null for non-existent user_id", async () => {
            const user = await User.from_db({ user_id: randomUUID() });
            expect(user).toBeNull();
        }, 30000);

        it("should preserve all user properties when retrieving from db", async () => {
            const originalUser = await User.new({
                first_name: "Test",
                last_name: "User",
                email: testEmail
            }, false);

            originalUser.status = "active";
            originalUser.role = "instructor";
            originalUser.must_change_password = false;

            await originalUser.save();

            const retrievedUser = await User.from_db({ email: testEmail });

            expect(retrievedUser?.status).toBe("active");
            expect(retrievedUser?.role).toBe("instructor");
            expect(retrievedUser?.must_change_password).toBe(false);
        }, 30000);
    });

    describe("User.exists()", () => {
        it("should return true for existing user by email", async () => {
            const user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            await user.save();

            const exists = await User.exists({ email: testEmail });
            expect(exists).toBe(true);
        }, 30000);

        it("should return true for existing user by user_id", async () => {
            const user = await User.new({
                first_name: "Jane",
                last_name: "Smith",
                email: testEmail
            }, false);

            await user.save();

            const exists = await User.exists({ user_id: user.user_id });
            expect(exists).toBe(true);
        }, 30000);

        it("should return false for non-existent email", async () => {
            const exists = await User.exists({ email: "nonexistent@example.com" });
            expect(exists).toBe(false);
        }, 30000);

        it("should return false for non-existent user_id", async () => {
            const exists = await User.exists({ user_id: randomUUID() });
            expect(exists).toBe(false);
        }, 30000);
    });

    describe("User.check_password()", () => {
        it("should return true for correct password", async () => {
            const user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            await user.save();

            const testPassword = "TestPassword123!";
            user.password_hash = await argon2.hash(testPassword);
            await user.save();

            const isValid = await user.check_password(testPassword);
            expect(isValid).toBe(true);
        }, 30000);

        it("should return false for incorrect password", async () => {
            const user = await User.new({
                first_name: "Jane",
                last_name: "Smith",
                email: testEmail
            }, false);

            await user.save();

            const testPassword = "TestPassword123!";
            user.password_hash = await argon2.hash(testPassword);
            await user.save();

            const isValid = await user.check_password("WrongPassword");
            expect(isValid).toBe(false);
        }, 30000);

        it("should handle special characters in passwords", async () => {
            const user = await User.new({
                first_name: "Test",
                last_name: "User",
                email: testEmail
            }, false);

            const specialPassword = "P@ssw0rd!#$%^&*()";
            user.password_hash = await argon2.hash(specialPassword);
            await user.save();

            const isValid = await user.check_password(specialPassword);
            expect(isValid).toBe(true);
        }, 30000);
    });

    describe("User.reset_password()", () => {
        it("should generate a new password hash", async () => {
            const user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            const originalHash = user.password_hash;

            const newPassword = await user.reset_password(false);

            expect(user.password_hash).not.toBe(originalHash);
            expect(newPassword).toBeDefined();
            expect(newPassword.length).toBeGreaterThan(0);
        }, 30000);

        it("should allow login with new password after reset", async () => {
            const user = await User.new({
                first_name: "Jane",
                last_name: "Smith",
                email: testEmail
            }, false);

            await user.save();

            const newPassword = await user.reset_password(false);

            const isValid = await user.check_password(newPassword);
            expect(isValid).toBe(true);
        }, 30000);

        it("should invalidate old password after reset", async () => {
            const user = await User.new({
                first_name: "Test",
                last_name: "User",
                email: testEmail
            }, false);

            const oldPassword = "OldPassword123!";
            user.password_hash = await argon2.hash(oldPassword);
            await user.save();

            const newPassword = await user.reset_password(false);

            const oldIsValid = await user.check_password(oldPassword);
            const newIsValid = await user.check_password(newPassword);

            expect(oldIsValid).toBe(false);
            expect(newIsValid).toBe(true);
        }, 30000);
    });

    describe("User.set_password()", () => {
        it("should set a new password", async () => {
            const user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            const newPassword = "MyNewPassword123!";
            await user.set_password(newPassword);

            const isValid = await user.check_password(newPassword);
            expect(isValid).toBe(true);
        }, 30000);

        it("should set must_change_password to false", async () => {
            const user = await User.new({
                first_name: "Jane",
                last_name: "Smith",
                email: testEmail
            }, false);

            expect(user.must_change_password).toBe(true);

            await user.set_password("NewPassword123!");

            expect(user.must_change_password).toBe(false);
        }, 30000);

        it("should persist new password to database", async () => {
            const user = await User.new({
                first_name: "Test",
                last_name: "User",
                email: testEmail
            }, false);

            await user.save();

            const newPassword = "DatabasePassword123!";
            await user.set_password(newPassword);
            await user.save();

            const retrievedUser = await User.from_db({ email: testEmail });
            expect(retrievedUser).toBeDefined();

            const isValid = await retrievedUser!.check_password(newPassword);
            expect(isValid).toBe(true);
        }, 30000);

        it("should invalidate previous password", async () => {
            const user = await User.new({
                first_name: "John",
                last_name: "Doe",
                email: testEmail
            }, false);

            const oldPassword = "OldPassword123!";
            user.password_hash = await argon2.hash(oldPassword);

            const newPassword = "NewPassword123!";
            await user.set_password(newPassword);

            const oldIsValid = await user.check_password(oldPassword);
            expect(oldIsValid).toBe(false);
        }, 30000);
    });

    describe("User properties", () => {
        it("should maintain all properties after round-trip to database", async () => {
            const user = await User.new({
                first_name: "Complete",
                last_name: "Test",
                email: testEmail
            }, false);

            user.status = "active";
            user.role = "admin";
            user.must_change_password = false;

            await user.save();

            const retrieved = await User.from_db({ email: testEmail });

            expect(retrieved?.first_name).toBe("Complete");
            expect(retrieved?.last_name).toBe("Test");
            expect(retrieved?.email).toBe(testEmail);
            expect(retrieved?.status).toBe("active");
            expect(retrieved?.role).toBe("admin");
            expect(retrieved?.must_change_password).toBe(false);
        }, 30000);

        it("should have distinct user_ids for different users", async () => {
            const user1 = await User.new({
                first_name: "User",
                last_name: "One",
                email: testEmail
            }, false);

            await user1.save();

            const user2 = await User.new({
                first_name: "User",
                last_name: "Two",
                email: testEmail2
            }, false);

            await user2.save();

            expect(user1.user_id).not.toBe(user2.user_id);
        }, 30000);
    });
});
