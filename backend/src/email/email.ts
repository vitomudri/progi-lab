import { env } from "../env.js";
import { User } from "../models/User.js";
import { createTransport } from "nodemailer";

const transport = createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
        user: env.EMAIL_USERNAME,
        pass: env.EMAIL_PASSWORD
    }
});

/**
 * Must be called at the start of the application.
 * Verifies the validity of the SMTP server login credentials.
 * Can throw an error.
 */
export async function init_email() {
    return transport.verify();
}

/**
 * All possible options for constructing an attachment
 */
export type AttachmentOptions =
    | { file_name: string; file_content: string; file_encoding: string; mime_type?: string }
    | { file_name: string; file_url: string; mime_type?: string };

/**
 * An attachment
 */
export class Attachment {
    public filename: string;
    public content?: string;
    public href?: string;
    public contentType?: string;
    public encoding?: string;

    constructor(options: AttachmentOptions) {
        this.filename = options.file_name;

        if ("file_content" in options) {
            this.content = options.file_content;
            this.encoding = options.file_encoding;
        } else if ("file_url" in options) {
            this.href = options.file_url;
        }

        if (options.mime_type) {
            this.contentType = options.mime_type;
        }
    }
}

/**
 * An email builder.
 */
export class EmailBuilder {
    private to: string[] = [];
    private cc: string[] = [];
    private bcc: string[] = [];
    private subject?: string;
    private text?: string;
    private html?: string;
    private attachments: Attachment[] = [];

    private static format_address(user: User): string {
        const display_name = [user.ime, user.prezime].filter(Boolean).join(" ").trim();
        return display_name ? `${display_name} <${user.email}>` : user.email;
    }

    add_recipient(...users: User[]): this {
        this.to.push(...users.map((u) => EmailBuilder.format_address(u)));
        return this;
    }

    add_carbon_copy(...users: User[]): this {
        this.cc.push(...users.map((u) => EmailBuilder.format_address(u)));
        return this;
    }

    add_blind_carbon_copy(...users: User[]): this {
        this.bcc.push(...users.map((u) => EmailBuilder.format_address(u)));
        return this;
    }

    with_subject(subject: string): this {
        this.subject = subject;
        return this;
    }

    with_text_body(text: string): this {
        this.text = text;
        delete this.html;
        return this;
    }

    with_html_body(html: string, text_fallback?: string): this {
        this.html = html;
        if (text_fallback) {
            this.text = text_fallback;
        } else {
            delete this.text;
        }
        return this;
    }

    add_attachment(...attachments: Attachment[]): this {
        this.attachments.push(...attachments);
        return this;
    }

    /**
     * Build the email, based on its current state
     *
     * @returns The object representing the email that can be used with `nodemailer`
     */
    build() {
        if (this.to.length == 0) throw new Error("Email must have at least one recipient");
        if (!this.subject) throw new Error("Email must have a subject");
        if (!this.text && !this.html) throw new Error("Email must have a body");

        return {
            from: env.EMAIL_FROM,
            to: this.to,
            cc: this.cc.length ? this.cc : undefined,
            bcc: this.bcc.length ? this.bcc : undefined,
            subject: this.subject,
            text: this.text,
            html: this.html,
            attachments: this.attachments.length ? this.attachments : undefined
        };
    }

    /**
     * Build and send the email, based on its current state
     *
     * @returns The SMTP transport object representing the sent email
     */
    async build_and_send() {
        return transport.sendMail(this.build());
    }
}
