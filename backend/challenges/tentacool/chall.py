from Crypto.Util.number import getRandomRange
import ecdsa, hashlib, string

FLAG = open("flag.txt", "rb").read().strip()

E = ecdsa.curves.SECP256k1
g = E.generator * 246
n = E.order
p = E.curve.p()

def keygen():
    x = getRandomRange(1, n - 1)
    y = g * -x
    print("Tentacool resets the key...")
    print("x =", x)
    return x, y

def sign(x, m: bytes):
    k = ecdsa.rfc6979.generate_k(g.x(), x % g.x(), hashlib.sha512, m) * p % n
    r = g * k
    r = r.x()
    e = int(hashlib.sha256(str(r).encode() + m).hexdigest(), 16)
    s = (k + x * e) % n
    return e, s

def verify(y, m: bytes, e, s):
    r = g * s + y * e
    r = r.x()
    ev = int(hashlib.sha256(str(r).encode() + m).hexdigest(), 16)
    return e == ev

print("Tentacool challenges you...")
x, y = keygen()
for _ in range(27):
    print("1. Keygen")
    print("2. Sign")
    print("3. Verify")
    choice = int(input(">> "))

    if choice == 1:
        x, y = keygen()
    elif choice == 2:
        m = bytes.fromhex(input("Message: "))
        if any(c.encode() in m for c in string.printable):
            print("Invalid message")
            continue
        e, s = sign(x, m)
        print(f"Signature: ({e}, {s})")
    elif choice == 3:
        m = bytes.fromhex(input("Message: "))
        e = int(input("e: "), 16)
        s = int(input("s: "), 16)

        if not verify(y, m, e, s):
            print("Invalid")
            exit(1)

        print("Valid")
        pt = m.decode()

        if pt == 'Tentacool approves of this message!':
            print(FLAG)
            exit(0)
        else:
            break
    print("Tentacool bids farewell...")


# Challenge: Tentacool
# Original: palubasa from Recursion CTF 2025
# Author: azuketto
# Source: https://github.com/chronopad/chrono-archive/tree/main/national/RecursionCTF_2025/cryptography/palubasa
# Description: Non-standard ECDSA which can be converted into HNP (Hidden Number Problem), allowing the usage of LLL to recover the private key.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/tentacool
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/72.png
# Tags: ["algc:ECC", "method:LLL", "prob:HNP", "addt:ECDSA"]
