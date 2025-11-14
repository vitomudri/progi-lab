import { User } from "./User.js";

async function test() {
    console.log("Provjeravam postoji li email...");
    const exists = await User.exists_in_db({ email: "mia@example.com" });
    console.log("Postoji?", exists);

    if (!exists) {
        console.log("➡ Ne postoji. Spremam novog...");
        const novi = await User.new({
            first_name: "Mia",
            last_name: "Zoroja",
            email: "mia@example.com"
        });
        await novi.save();
        console.log("Novi user spremljen.");
    }

    console.log("➡ Dohvaćam usera...");
    const user = await User.from_db({ email: "mia@example.com" });
    console.log("User dobiven:", user);
}

test();
