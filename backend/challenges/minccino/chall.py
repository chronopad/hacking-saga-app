from Crypto.Util.number import bytes_to_long, getPrime

e = 65537
p, q = getPrime(512), getPrime(512)
n = p * q
d = pow(e, -1, (p-1)*(q-1))

FLAG = open('flag.txt', 'rb').read().strip()

m = bytes_to_long(FLAG)
c = pow(m, e, n)
food_spoils = d % (p - 1)

with open("output.txt", "w") as f:
    f.write("Mincinno challenges you...\n")
    f.write(f"n = {n}\n")
    f.write(f"e = {e}\n")
    f.write(f"c = {c}\n")
    f.write(f"spoils = {food_spoils}\n")


# Challenge: Minccino
# Original: resonance from Recursion CTF 2025
# Author: Pablu
# Source: https://github.com/chronopad/chrono-archive/tree/main/national/RecursionCTF_2025/cryptography/resonance
# Description: RSA with information leaks that leads to prime factor recovery.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/minccino
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/572.png
# Tags: ["algc:RSA", "method:MathEq"]
