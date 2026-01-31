// Encryption utilities for secure local storage
class SecureStorage {
  // Generate a key from a password using PBKDF2
  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a unique encryption key for this extension instance
  static async getOrCreateMasterKey() {
    const stored = await chrome.storage.local.get(['masterSalt']);
    let salt;
    
    if (!stored.masterSalt) {
      // Generate new salt on first run
      salt = crypto.getRandomValues(new Uint8Array(16));
      await chrome.storage.local.set({ 
        masterSalt: Array.from(salt) 
      });
    } else {
      salt = new Uint8Array(stored.masterSalt);
    }
    
    // Use a combination of extension ID and a random component
    const extensionId = chrome.runtime.id;
    const password = `${extensionId}-servicekeeper-secure`;
    
    return this.deriveKey(password, salt);
  }

  // Encrypt data
  static async encrypt(data) {
    const key = await this.getOrCreateMasterKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(JSON.stringify(data))
    );
    
    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    };
  }

  // Decrypt data
  static async decrypt(encryptedData) {
    try {
      const key = await this.getOrCreateMasterKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.encrypted)
      );
      
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Store encrypted data
  static async saveSecure(key, data) {
    const encrypted = await this.encrypt(data);
    await chrome.storage.local.set({ [key]: encrypted });
  }

  // Retrieve and decrypt data
  static async loadSecure(key) {
    const stored = await chrome.storage.local.get([key]);
    if (!stored[key]) return null;
    return await this.decrypt(stored[key]);
  }
}

// 2FA Token Generator (TOTP)
class TOTPGenerator {
  static base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';
    
    base32 = base32.replace(/=+$/, '').toUpperCase();
    
    for (let i = 0; i < base32.length; i++) {
      const val = alphabet.indexOf(base32.charAt(i));
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const chunk = bits.substr(i, 8);
      hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
    }
    
    return hex;
  }

  static async generateTOTP(secret, time = null) {
    try {
      // Remove spaces and convert to uppercase
      secret = secret.replace(/\s/g, '').toUpperCase();
      
      // Decode base32 secret
      const keyHex = this.base32Decode(secret);
      const keyBytes = new Uint8Array(keyHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      
      // Get current time step (30 seconds)
      const epoch = time || Math.floor(Date.now() / 1000);
      const timeStep = Math.floor(epoch / 30);
      
      // Convert time to 8-byte array
      const timeBytes = new Uint8Array(8);
      let ts = timeStep;
      for (let i = 7; i >= 0; i--) {
        timeBytes[i] = ts & 0xff;
        ts >>>= 8;
      }
      
      // Import key for HMAC
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );
      
      // Generate HMAC
      const signature = await crypto.subtle.sign('HMAC', key, timeBytes);
      const signatureArray = new Uint8Array(signature);
      
      // Dynamic truncation
      const offset = signatureArray[signatureArray.length - 1] & 0x0f;
      const binary = 
        ((signatureArray[offset] & 0x7f) << 24) |
        ((signatureArray[offset + 1] & 0xff) << 16) |
        ((signatureArray[offset + 2] & 0xff) << 8) |
        (signatureArray[offset + 3] & 0xff);
      
      // Generate 6-digit code
      const code = (binary % 1000000).toString().padStart(6, '0');
      
      // Calculate remaining seconds
      const remainingSeconds = 30 - (Math.floor(Date.now() / 1000) % 30);
      
      return { code, remainingSeconds };
    } catch (error) {
      console.error('TOTP generation failed:', error);
      return null;
    }
  }

  static parseQRCode(qrData) {
    // Parse otpauth:// URI
    // Format: otpauth://totp/Label?secret=BASE32SECRET&issuer=Issuer
    try {
      const url = new URL(qrData);
      if (url.protocol !== 'otpauth:') return null;
      
      const params = new URLSearchParams(url.search);
      const secret = params.get('secret');
      const issuer = params.get('issuer') || url.pathname.split('/')[2] || 'Unknown';
      
      if (!secret) return null;
      
      return { secret, issuer };
    } catch (error) {
      // Try to extract secret if it's just the base32 string
      if (/^[A-Z2-7]+=*$/.test(qrData.replace(/\s/g, ''))) {
        return { secret: qrData, issuer: 'Manual Entry' };
      }
      return null;
    }
  }
}
