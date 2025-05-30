from Crypto.Util.number import getPrime, bytes_to_long
from random import getrandbits

FLAG = bytes_to_long(open("flag.txt", "rb").read())

p, q = getPrime(1024), getPrime(1024)
e = 65537
n = p*q
c = pow(FLAG, e, n)

leak1 = getrandbits(1024) | getrandbits(1024)
leak2 = getrandbits(1024) | getrandbits(1024)

P = p & leak1
Q = q & leak2

print("c =", c)
print("n =", n)
print("leak1 =", leak1)
print("leak2 =", leak2)
print("P =", P)
print("Q =", Q)


# Challenge: Scyther
# Original: Dried Up Crypto from Imaginary CTF Round 64 (April 2025)
# Author: moai_man
# Source: https://imaginaryctf.org/ArchivedChallenges/64
# Description: RSA with random bits of the prime factor leaked, allowing the full recovery via branch and prune algorithm.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/scyther
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/123.png
# Tags: ["algc:RSA", "method:BranchAndPrune"]
