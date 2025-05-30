from Crypto.Util.number import getPrime

e = 65537
p, q = getPrime(512), getPrime(512)
n = p * q
d = pow(e, -1, (p-1)*(q-1))

FLAG = open('flag.txt', 'rb').read().strip()
cFLAG = pow(int.from_bytes(FLAG, 'big'), e, n)

print("Carnivine challenges you...")
print("n =", n)
print("c =", cFLAG)

while True:
    try:
        print("Carnivine offers to decrypt...")
        c = int(input('Ciphertext: '))
        m = pow(c, d, n).to_bytes(n.bit_length() // 8, 'big')
        print("Carnivine refuses to decrypt...\n")
    except KeyboardInterrupt:
        print("Carnivine faints...")
        break
    except:
        print('Carnivine feels sick...\n')


# Challenge: Carnivine
# Original: Broken Chall from Gemastik CTF 2024
# Author: Chovid99
# Source: https://github.com/ctf-gemastik/penyisihan-2024/blob/main/crypto/broken-chall
# Description: A variant of RSA LSB decryption oracle challenge, where .to_bytes() function serves as a semi-location oracle.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/carnivine
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/455.png
# Tags: ["algc:RSA", "method:LSBOracle", "addt:Variant"]
