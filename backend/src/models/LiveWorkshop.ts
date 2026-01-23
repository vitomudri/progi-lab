import { pool } from "../db/db.js";
import { randomUUID, type UUID } from "crypto";

export type LiveWorkshopProps = {
    workshop_id: UUID;
    title: string | null;
    description: string | null;
    date_time: Date | null;
    seat_number: number | null;
    duration: number | null;
    recording_url: string | null;
    instructor_id: UUID | null;
};

export class LiveWorkshop {
    workshop_id: UUID;
    title: string | null;
    description: string | null;
    date_time: Date | null;
    seat_number: number | null;
    duration: number | null;
    recording_url: string | null;
    instructor_id: UUID | null;
    private constructor(
        workshop_id: UUID,
        title: string | null,
        description: string | null,
        date_time: Date | null,
        seat_number: number | null,
        duration: number | null,
        recording_url: string | null,
        instructor_id: UUID | null
    ) {
        this.workshop_id = workshop_id;
        this.title = title;
        this.description = description;
        this.date_time = date_time;
        this.seat_number = seat_number;
        this.duration = duration;
        this.recording_url = recording_url;
        this.instructor_id = instructor_id;
    }

    // ------------------------
    // Factory
    // ------------------------
    static new(
        title : string,
        description : string,
        date_time : Date,
        seat_number : number,
        duration : number,
        instructor_id : UUID
    ): LiveWorkshop {

        const workshop = new LiveWorkshop(
            randomUUID(),
            title,
            description,
            date_time,
            seat_number,
            duration,
            null,
            instructor_id
        );

        return workshop;
    }

    static fromDb(row: any): LiveWorkshop {
        return new LiveWorkshop(
            row.workshop_id,
            row.title,
            row.description,
            row.date_time,
            row.seat_number,
            row.duration,
            row.recording_url,
            row.instructor_id
        );
    }

    static async findById(workshopId: string): Promise<LiveWorkshop | null> {
        const res = await pool.query(
            `SELECT * FROM LiveWorkshops WHERE workshop_id = $1`,
            [workshopId]
        );

        if (res.rowCount === 0) return null;

        return LiveWorkshop.fromDb(res.rows[0]);
    }

    // Getters
    get id(): string {
        return this.workshop_id;
    }

    get seatLimit(): number | null {
        return this.seat_number;
    }

    // Business logic
    /**
     * Counts ALL reservations for this workshop
     */
    async getTakenSeats(): Promise<number> {
        const res = await pool.query(
            `
            SELECT COUNT(*)::int AS taken
            FROM Reservations
            WHERE workshop_id = $1
            `,
            [this.id]
        );

        return res.rows[0].taken;
    }

    async getAvailableSeats(): Promise<number | null> {
        if (this.seatLimit === null) return null;

        const taken = await this.getTakenSeats();
        return Math.max(this.seatLimit - taken, 0);
    }

    async isFull(): Promise<boolean> {
        if (this.seatLimit === null) return false;

        const taken = await this.getTakenSeats();
        return taken >= this.seatLimit;
    }
}
