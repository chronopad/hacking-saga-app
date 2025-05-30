from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import os

def encrypt(key, pt):
    cipher = AES.new(key, AES.MODE_CBC)
    ct = cipher.decrypt(pad(pt, 16))
    return cipher.iv + ct

print("Spinda challenges you...")
print("Spinda wants plaintext, Spinda gives ciphertext...")

FLAG = open('flag.txt', 'rb').read().strip()
assert len(FLAG) == 50

KEY = os.urandom(16)
cFLAG = encrypt(KEY, FLAG)
print("Spinda gives special ciphertext:", cFLAG.hex())

while True:
    m = bytes.fromhex(input("Spinda wants plaintext: "))
    c = encrypt(KEY, m)
    print("Spinda gives ciphertext:", c.hex())


# Challenge: Spinda
# Original: baby-aes from Gemastik CTF 2024
# Author: Chovid99
# Source: https://github.com/ctf-gemastik/penyisihan-2024/tree/main/crypto/baby-aes
# Description: Faulty CBC encryption allows the full recovery of all plaintext blocks via knowing the plaintext of the last block.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/spinda
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/327.png
# Tags: ["algc:AES", "method:ModeAbuse"]
