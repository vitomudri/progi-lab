import { User } from './User.js';

async function test() {
  console.log('Provjeravam postoji li email...');
  const exists = await User.existsByEmail('mia@example.com');
  console.log('Postoji?', exists);

  if (!exists) {
    console.log('➡ Ne postoji. Spremam novog...');
    const novi = new User({
      ime: 'Mia',
      prezime: 'Zoroja',
      email: 'mia@example.com',
      lozinka: 'tajna123'
    });
    await novi.save();
    console.log('Novi user spremljen.');
  }

  console.log('➡ Dohvaćam usera...');
  const user = await User.getByEmail('mia@example.com');
  console.log('User dobiven:', user);
}

test();
