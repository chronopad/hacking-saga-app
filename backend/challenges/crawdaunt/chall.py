from Crypto.Util.number import *

class ClawRNG:
    def __init__(self):
        self.p = getPrime(8)
        self.q = getPrime(8)
        self.M = self.p * self.q
        self.x = getPrime(15)
        print(f"Crawdaunt grants you a gift: M = {self.M}")

    def get_bit(self):
        self.x = pow(self.x, 2, self.M)
        return self.x % 2

class ClawOracle:
    def __init__(self, rng):
        self.rng = rng
        self.p = getPrime(512)
        self.q = getPrime(512)
        self.n = self.p * self.q
        self.e = 65537
        self.phi = (self.p - 1) * (self.q - 1)
        self.d = pow(self.e, -1, self.phi)

    def encrypt(self, m):
        return pow(m, self.e, self.n)

    def decrypt(self, c):
        return pow(c, self.d, self.n)

    def claw_oracle(self, c):
        randbit = self.rng.get_bit()
        result = self.decrypt(c)

        return int(result > self.n // 2) if randbit else result % 2

FLAG = bytes_to_long(open("flag.txt", "rb").read())

print("Crawdaunt challenges you...")
clawRNG = ClawRNG()
clawOracle = ClawOracle(clawRNG)
chances = 1500

while chances > 0:
    print("\nCrawdaunt Claw Oracle System")
    print("1. Encrypt the flag")
    print("2. Decrypt a message")
    print("3. Surrender")
    choice = int(input("> "))

    if choice == 1:
        print("Crawdaunt grants you: n =", clawOracle.n)
        print("Crawdaunt grants you:", clawOracle.encrypt(FLAG))
    elif choice == 2:
        c = int(input("Ciphertext: "), 16)
        print("Crawdaunt grants you:", clawOracle.claw_oracle(c))
    else:
        break
    chances -= 1


# Challenge: Crawdaunt
# Original: Twin Oracles from HTB Cyber Apocalypse 2025
# Author: Babafaba
# Source: https://app.hackthebox.com/challenges/Twin%20Oracles
# Description: BBS PRNG state recovery to determine the type of LSB oracle output provided.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/crawdaunt
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/342.png
# Tags: ["algc:RSA", "prng:BBS", "method:LSBOracle"]
