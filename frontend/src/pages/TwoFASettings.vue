<template>
    <div class="twofa-settings-wrapper">
        <div class="settings-card">
            <h2>Postavke dvofaktorske autentifikacije</h2>

            <div v-if="loading" class="loading">Učitavanje...</div>

            <template v-else>
                <!-- 2FA Status Section -->
                <div class="status-section">
                    <h3>Status</h3>
                    <p v-if="totpEnabled" class="status-enabled">
                        ✓ 2FA je uključena
                    </p>
                    <p v-else class="status-disabled">
                        ✗ 2FA je isključena
                    </p>
                </div>

                <!-- Setup 2FA Section -->
                <div v-if="!totpEnabled" class="setup-section">
                    <h3>Aktivirajte dvofaktorsku autentifikaciju</h3>

                    <div v-if="!showQRCode" class="action-buttons">
                        <button @click="initiate2FA" :disabled="isLoading">
                            {{ isLoading ? "Učitavanje..." : "Počni postavljanje" }}
                        </button>
                    </div>

                    <!-- QR Code Display -->
                    <div v-if="showQRCode" class="qr-code-section">
                        <p>Skenira QR kod sa vašom autentifikatorskom aplikacijom (Google Authenticator, Authy, itd.)
                        </p>
                        <img v-if="qrCode" :src="qrCode" alt="QR Code za 2FA" class="qr-code-image" />

                        <div class="manual-entry">
                            <p><strong>Ili ručno unesite ključ:</strong></p>
                            <code class="secret-key">{{ secret }}</code>
                            <button @click="copySecret" class="copy-btn">Kopiraj ključ</button>
                        </div>

                        <div class="verification-form">
                            <p>Unesite 6-znamenkasti kod iz vaše autentifikatorske aplikacije:</p>
                            <input v-model="verificationToken" type="text" placeholder="000000" maxlength="6"
                                inputmode="numeric" :disabled="isLoading" />
                            <div class="form-actions">
                                <button @click="verify2FASetup" :disabled="isLoading || !verificationToken">
                                    {{ isLoading ? "Provjera..." : "Potvrdi postavljanje" }}
                                </button>
                                <button @click="cancelSetup" class="cancel-btn" :disabled="isLoading">
                                    Otkaži
                                </button>
                            </div>
                        </div>

                        <p v-if="setupError" class="error-message">{{ setupError }}</p>
                    </div>
                </div>

                <!-- Disable 2FA Section -->
                <div v-if="totpEnabled" class="disable-section">
                    <h3>Deaktivirajte dvofaktorsku autentifikaciju</h3>

                    <div v-if="!showDisableForm" class="action-buttons">
                        <button @click="showDisableForm = true" class="danger-btn" :disabled="isLoading">
                            Deaktiviraj 2FA
                        </button>
                    </div>

                    <div v-if="showDisableForm" class="disable-form">
                        <p>Unesite 6-znamenkasti kod iz vaše autentifikatorske aplikacije za potvrdu:</p>
                        <input v-model="disableToken" type="text" placeholder="000000" maxlength="6" inputmode="numeric"
                            :disabled="isLoading" />
                        <div class="form-actions">
                            <button @click="disable2FA" class="danger-btn" :disabled="isLoading || !disableToken">
                                {{ isLoading ? "Deaktiviram..." : "Deaktiviraj" }}
                            </button>
                            <button @click="showDisableForm = false" class="cancel-btn" :disabled="isLoading">
                                Otkaži
                            </button>
                        </div>

                        <p v-if="disableError" class="error-message">{{ disableError }}</p>
                    </div>
                </div>

                <!-- Success Messages -->
                <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const loading = ref(true);
const isLoading = ref(false);
const totpEnabled = ref(false);
const showQRCode = ref(false);
const showDisableForm = ref(false);
const qrCode = ref('');
const secret = ref('');
const verificationToken = ref('');
const disableToken = ref('');
const setupError = ref('');
const disableError = ref('');
const successMessage = ref('');

onMounted(async () => {
    await fetch2FAStatus();
});

async function fetch2FAStatus() {
    try {
        const res = await fetch('/api/v1/auth/2fa/status', {
            credentials: 'include'
        });

        const data = await res.json();
        if (res.ok) {
            totpEnabled.value = data.totp_enabled;
        }
    } catch (err) {
        console.error('Error fetching 2FA status:', err);
    } finally {
        loading.value = false;
    }
}

async function initiate2FA() {
    isLoading.value = true;
    setupError.value = '';

    try {
        const res = await fetch('/api/v1/auth/2fa/request-setup', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await res.json();

        if (res.ok) {
            secret.value = data.secret;
            qrCode.value = data.qr_code;
            showQRCode.value = true;
        } else {
            setupError.value = data.error || 'Greška pri postavljanju 2FA';
        }
    } catch (err) {
        setupError.value = 'Greška na serveru. Pokušajte ponovno.';
    } finally {
        isLoading.value = false;
    }
}

async function verify2FASetup() {
    if (!verificationToken.value || verificationToken.value.length !== 6) {
        setupError.value = 'Molimo unesite 6-znamenkasti kod.';
        return;
    }

    isLoading.value = true;
    setupError.value = '';

    try {
        const res = await fetch('/api/v1/auth/2fa/verify-setup', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: secret.value,
                token: verificationToken.value
            })
        });

        const data = await res.json();

        if (res.ok) {
            totpEnabled.value = true;
            showQRCode.value = false;
            verificationToken.value = '';
            secret.value = '';
            qrCode.value = '';
            successMessage.value = 'Dvofaktorska autentifikacija je uspješno aktivirana!';
            setTimeout(() => {
                successMessage.value = '';
            }, 5000);
        } else {
            setupError.value = data.error || 'Pogrešan kod. Pokušajte ponovno.';
        }
    } catch (err) {
        setupError.value = 'Greška na serveru. Pokušajte ponovno.';
    } finally {
        isLoading.value = false;
    }
}

async function disable2FA() {
    if (!disableToken.value || disableToken.value.length !== 6) {
        disableError.value = 'Molimo unesite 6-znamenkasti kod.';
        return;
    }

    isLoading.value = true;
    disableError.value = '';

    try {
        const res = await fetch('/api/v1/auth/2fa/disable', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: disableToken.value
            })
        });

        const data = await res.json();

        if (res.ok) {
            totpEnabled.value = false;
            showDisableForm.value = false;
            disableToken.value = '';
            successMessage.value = 'Dvofaktorska autentifikacija je uspješno deaktivirana.';
            setTimeout(() => {
                successMessage.value = '';
            }, 5000);
        } else {
            disableError.value = data.error || 'Pogrešan kod. Pokušajte ponovno.';
        }
    } catch (err) {
        disableError.value = 'Greška na serveru. Pokušajte ponovno.';
    } finally {
        isLoading.value = false;
    }
}

function cancelSetup() {
    showQRCode.value = false;
    qrCode.value = '';
    secret.value = '';
    verificationToken.value = '';
    setupError.value = '';
}

function copySecret() {
    navigator.clipboard.writeText(secret.value);
    // Optionally show a toast notification
}
</script>

<style scoped>
.twofa-settings-wrapper {
    display: flex;
    justify-content: center;
    padding: 2rem;
    background-color: #F5F1E5;
    min-height: calc(100vh - 140px);
}

.settings-card {
    color: #000000;
    width: 100%;
    max-width: 600px;
    padding: 3rem;
    border-radius: 3rem;
    background-color: #FFFCF4;
}

.settings-card h2 {
    font-weight: 450;
    font-size: 1.875rem;
    margin-bottom: 2rem;
    text-align: center;
}

.settings-card h3 {
    font-weight: 400;
    font-size: 1.25rem;
    margin-bottom: 1rem;
    margin-top: 1.5rem;
}

.status-section {
    padding: 1.5rem;
    background-color: #F9F6F0;
    border-radius: 1rem;
    margin-bottom: 2rem;
}

.status-enabled {
    color: #2e7d32;
    font-size: 1.1rem;
}

.status-disabled {
    color: #c62828;
    font-size: 1.1rem;
}

.setup-section,
.disable-section {
    margin-bottom: 2rem;
}

.action-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.qr-code-section {
    padding: 1.5rem;
    background-color: #F9F6F0;
    border-radius: 1rem;
    margin-bottom: 1rem;
}

.qr-code-image {
    max-width: 300px;
    width: 100%;
    margin: 1.5rem auto;
    display: block;
    border: 2px solid #E2D9C2;
    border-radius: 0.5rem;
    padding: 1rem;
    background-color: white;
}

.manual-entry {
    margin: 1.5rem 0;
    padding: 1rem;
    background-color: white;
    border-radius: 0.5rem;
}

.secret-key {
    display: block;
    padding: 0.5rem;
    background-color: #F0F0F0;
    border-radius: 0.25rem;
    margin: 0.5rem 0;
    word-break: break-all;
    font-family: 'Courier New', monospace;
}

.copy-btn {
    background-color: #E2D9C2;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    margin-top: 0.5rem;
}

.verification-form,
.disable-form {
    padding: 1.5rem;
    background-color: #F9F6F0;
    border-radius: 1rem;
    margin-bottom: 1rem;
}

.verification-form input,
.disable-form input {
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    display: block;
    background-color: white;
    width: 100%;
    margin: 1rem 0;
    padding: 0.75rem;
    font-size: 1.25rem;
    text-align: center;
    letter-spacing: 0.3rem;
}

.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.form-actions button {
    flex: 1;
}

button {
    border: none;
    border-radius: 0.5rem;
    background-color: #E2D9C2;
    padding: 0.75rem 1rem;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
}

button:hover:not(:disabled) {
    background-color: #D4C9B0;
}

button:disabled {
    background-color: #D0D0D0;
    cursor: not-allowed;
    opacity: 0.7;
}

.danger-btn {
    background-color: #d32f2f;
    color: white;
}

.danger-btn:hover:not(:disabled) {
    background-color: #b71c1c;
}

.cancel-btn {
    background-color: #999999;
}

.cancel-btn:hover:not(:disabled) {
    background-color: #777777;
}

.error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #ffebee;
    border-radius: 0.25rem;
}

.success-message {
    color: #2e7d32;
    font-size: 0.95rem;
    padding: 1rem;
    background-color: #e8f5e9;
    border-radius: 0.5rem;
    text-align: center;
    margin-top: 1rem;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #666;
}
</style>
