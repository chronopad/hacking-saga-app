from Crypto.Util.number import bytes_to_long, getPrime

e = 65537
p, q = getPrime(512), getPrime(512)
n = p * q
d = pow(e, -1, (p-1)*(q-1))

FLAG = open('flag.txt', 'rb').read().strip()
cFLAG = pow(bytes_to_long(FLAG), e, n)

print("Shroomish challenges you...")
print("n =", n)
print("c =", cFLAG)

while True:
    print("Shroomish offers to decrypt...")
    c = int(input('Ciphertext: '))
    m = pow(c, d, n)
    print(f"Shroomish gives one piece: {m % 2}\n")


# Challenge: Shroomish
# Original: Least Significant Bit Oracle Attack from Crypton GitHub
# Author: ashutosh1206
# Source: https://github.com/ashutosh1206/Crypton/tree/master/RSA-encryption/Attack-LSBit-Oracle
# Description: Introductory to LSB oracle with the parity oracle.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/shroomish
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/285.png
# Tags: ["algc:RSA", "method:LSBOracle"]
