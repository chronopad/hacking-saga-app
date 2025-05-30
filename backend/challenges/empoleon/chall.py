import random
from ecdsa import ellipticcurve
from Crypto.Util.number import getPrime, bytes_to_long, long_to_bytes

FLAG = open('/tmp/challenges/empoleon/flag.txt', 'rb').read()
assert(len(FLAG) <= 120)

p = 93556643250795678718734474880013829509320385402690660619699653921022012489089
a = 66001598144012865876674115570268990806314506711104521036747533612798434904785
b = 25255205054024371783896605039267101837972419055969636393425590261926131199028
x = 1663255323649316187237502679180020234514169346773977936323045878120391437837
y = 84006750294604478804216697619398950537391904455312244388797990516611936533488
curve = ellipticcurve.CurveFp(p, a, b)
G = ellipticcurve.Point(curve, x, y)
# q = E.base_ring().order()
# n = G.order()
# for k in range(1, 10):
#     assert(power_mod(q, k, n) != 1)
# assert(E.trace_of_frobenius() != 1)

p, q = getPrime(512), getPrime(512)
N = p * q
e = 0x10001
phi = (p-1)*(q-1)
d = pow(e, -1, phi)

print("Empoleon challenges you...")
while True:
    x = bytes_to_long(random.randbytes(16))
    if x % 2 == 1:
        break
Gx = G * x

while True:
    print("1. Encrypt")
    print("2. Decrypt")
    print("3. Flag")

    choice = int(input(">>> "))

    if choice == 1:
        pt = bytes.fromhex(input("Plaintext (hex): ").strip())
        pt = bytes_to_long(pt)
        ct = pow(pt, e * (pt.bit_length() + 1), N)
        print(long_to_bytes(int(ct)).hex())
    if choice == 2:
        ct = bytes.fromhex(input("Ciphertext (hex): ").strip())
        pt = pow(bytes_to_long(ct), d, N)
        y = bytes_to_long(random.randbytes(32))
        Gy = G * y * (x + 1)
        res = Gy + Gx * pt
        print(f"({res.x()}, {res.y()})")
    if choice == 3:
        pt = bytes_to_long(FLAG)
        ct = pow(pt, e, N)
        print(long_to_bytes(int(ct)).hex())


# Challenge: Empoleon
# Original: --python from Arkavidia 9.0 CTF Finals 2025
# Author: azuketto
# Source: https://github.com/chronopad/chrono-archive/tree/main/national/Arkavidia9.0-Finals_2025/cryptography/--python
# Description: Hidden parity oracle by using the property of the order of the elliptic curve.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/empoleon
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/395.png
# Tags: ["algc:RSA", "algc:ECC", "method:LSBOracle"]
